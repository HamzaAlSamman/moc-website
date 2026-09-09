// Run: node --conditions=react-server --test --test-isolation=none scripts/copyright-audit.test.mjs
// Requires scripts/prepare-copyright-test-db.mjs. Uses a dedicated LOCAL DB;
// actual route handlers, Prisma and notifications; session boundary and PDF
// transport are stubbed. Email bodies are captured in memory, never delivered.
import { capturedEmails } from "./copyright-audit-context.mjs";
import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { randomUUID } from "node:crypto";

const { prisma } = await import("../src/lib/prisma.js");
const citizen = await import("../src/app/api/copyright/route.js");
const admin = await import("../src/app/api/admin/copyright-submissions/[id]/route.js");
const adminList = await import("../src/app/api/admin/copyright-submissions/route.js");
const receipt = await import("../src/app/api/copyright/receipt/route.js");
const mailer = await import("../src/lib/copyright-mailer.js");
const { ROLES } = await import("../src/lib/permissions.js");
const ids = [];
const staff = {};
const pdf = "data:application/pdf;base64," + Buffer.from("%PDF-1.4\naudit fixture").toString("base64");
const prefix = `copyright-audit-${randomUUID()}`;
let ip = 0;
const payload = (overrides = {}) => ({
  applicantName: "مؤلف تجريبي للاختبار المحلي", applicantEmail: "copyright-audit@example.invalid",
  applicantPhone: "0912345678", applicantRole: "المؤلف", idDocType: "national_id",
  workTitle: "مصنف اختبار محلي", workCategory: "written", workOrigin: "original",
  workDesc: "وصف مصنف تجريبي مخصص للاختبارات فقط", province: "دمشق", center: "ديوان المديرية بدمشق",
  idFileFront: pdf, idFileBack: pdf, workFile: pdf, ...overrides,
});
const req = (method, body, query = "", headers = {}) => new Request(`http://localhost/api/copyright${query}`, {
  method, headers: { "content-type": "application/json", "x-forwarded-for": `audit-${++ip}`, ...headers },
  ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
});
async function seed(overrides = {}) {
  const row = await prisma.copyrightSubmission.create({ data: {
    ...payload(), completionDate: new Date().toISOString(), ...overrides,
  } });
  ids.push(row.id);
  return row;
}
async function post(data, expected = 400) {
  const response = await citizen.POST(req("POST", data));
  const result = await response.json();
  if (result.id) ids.push(result.id);
  assert.equal(response.status, expected, JSON.stringify(result));
  return result;
}
async function put(row, data, expected = 200) {
  const response = await citizen.PUT(req("PUT", { id: row.id, ...data }));
  const result = await response.json();
  assert.equal(response.status, expected, JSON.stringify(result));
  return result;
}
async function patch(row, role, data, expected = 200) {
  globalThis.copyrightAuditSession = { userId: staff[role].id, role };
  const response = await admin.PATCH(req("PATCH", data), { params: Promise.resolve({ id: row.id }) });
  const result = await response.json();
  assert.equal(response.status, expected, JSON.stringify(result));
  return result;
}
const payment = (action = "pay_initial", overrides = {}) => ({
  action, paymentGateway: "cham_cash", paymentRef: randomUUID(), paymentReceipt: pdf, ...overrides,
});

before(async () => {
  for (const role of Object.keys(ROLES)) staff[role] = await prisma.user.create({ data: {
    email: `${prefix}-${role}@example.invalid`, password: "unusable-test-password", nameAr: `اختبار ${role}`, role,
  } });
});
after(async () => {
  await prisma.copyrightSubmission.deleteMany({ where: { id: { in: ids } } });
  await prisma.notification.deleteMany({ where: { userId: { in: Object.values(staff).map(s => s.id) } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: Object.values(staff).map(s => s.id) } } });
  await prisma.user.deleteMany({ where: { id: { in: Object.values(staff).map(s => s.id) } } });
  await prisma.$disconnect();
});

for (const category of ["written", "informational", "audio_visual", "fine_arts", "folklore"]) {
  test(`POST accepts complete ${category} submission and ignores forged approval/payment`, async () => {
    const result = await post(payload({ workCategory: category, telecomFile: category === "informational" ? pdf : null,
      applicationStatus: "completed", paymentStatus: "fully_paid", paymentRef: "forged" }), 201);
    const stored = await prisma.copyrightSubmission.findUnique({ where: { id: result.id } });
    assert.equal(stored.applicationStatus, "submitted");
    assert.equal(stored.paymentStatus, "pending");
    assert.equal(stored.paymentRef, null);
    assert.match(stored.referenceNo, /^CPR-\d{4}-\d+$/);
  });
}
for (const field of ["applicantName", "applicantPhone", "applicantEmail", "applicantRole", "workTitle", "workCategory", "workOrigin", "workDesc", "province", "center", "workFile", "idFileFront", "idFileBack"]) {
  test(`POST rejects missing ${field}`, async () => { const data = payload(); delete data[field]; await post(data); });
}
test("POST accepts passport without reverse side", () => post(payload({ idDocType: "passport", idFileBack: null }), 201));
test("POST accepts Google Drive instead of work upload", () => post(payload({ workFile: null, workDriveUrl: "https://drive.google.com/file/d/audit/view" }), 201));
test("POST rejects simultaneous Drive and file", () => post(payload({ workDriveUrl: "https://drive.google.com/file/d/audit/view" })));
test("POST rejects disguised executable", () => post(payload({ workFile: "data:application/pdf;base64,TVouLi4=" })));
test("POST rejects untrusted work URL", () => post(payload({ workFile: null, workDriveUrl: "https://example.com/work.pdf" })));
test("POST rejects derived work without source permission", () => post(payload({ workOrigin: "derived", originalWorkName: "original" })));
test("POST accepts complete derived work", () => post(payload({ workOrigin: "derived", originalWorkName: "original", originalPermission: "موافقة خطية موثقة" }), 201));
for (const [role, docs] of [
  ["صاحب الشركة", { commercialRegisterFile: pdf, delegationFile: pdf, representativeIdFile: pdf }],
  ["الوكيل", { roleFile: pdf, originalOwnerIdFile: pdf }],
  ["الورثة", { roleFile: pdf, originalOwnerIdFile: pdf }],
]) {
  test(`POST accepts complete documents for ${role}`, () => post(payload({ applicantRole: role, ...docs }), 201));
  test(`POST rejects missing required documents for ${role}`, () => post(payload({ applicantRole: role })));
}
test("POST rejects invalid role", () => post(payload({ applicantRole: "forged-role" })));
test("POST trims role BEFORE checking role documents", () => post(payload({ applicantRole: " الوكيل " })));
test("POST rejects object instead of joint-author list", () => post(payload({ authors: { name: "forged" } })));
test("POST accepts joint-author passport", () => post(payload({ authors: [{ name: "مؤلف مشترك", idDocType: "passport", fileFront: pdf }] }), 201));
test("POST rejects joint author missing ID reverse", () => post(payload({ authors: [{ name: "مؤلف مشترك", idDocType: "national_id", fileFront: pdf }] })));
for (const body of ["{", "null", "[]", "42"]) test(`POST rejects malformed body ${body}`, () => post(body));
test("POST rejects declared oversized body", async () => {
  const response = await citizen.POST(req("POST", payload(), "", { "content-length": String(161 * 1024 * 1024) }));
  assert.equal(response.status, 413);
});
test("POST rate limit returns 429 on sixth attempt", async () => {
  const headers = { "x-forwarded-for": `${prefix}-limited` };
  for (let i = 0; i < 6; i++) assert.equal((await citizen.POST(req("POST", {}, "", headers))).status, i < 5 ? 400 : 429);
});

test("GET disallows listing and unknown codes", async () => {
  assert.equal((await citizen.GET(req("GET"))).status, 400);
  assert.equal((await citizen.GET(req("GET", undefined, "?code=missing"))).status, 404);
});
test("GET returns certificate fields and only joint-author names, never documents", async () => {
  const row = await seed({ authors: [{ name: "مؤلف مشترك", fileFront: pdf, signature: "secret" }] });
  const response = await citizen.GET(req("GET", undefined, `?code=${row.id}`));
  const { submission } = await response.json();
  assert.equal(submission.workDesc, row.workDesc);
  assert.equal(submission.center, row.center);
  assert.deepEqual(submission.authors, [{ name: "مؤلف مشترك" }]);
  for (const key of ["applicantEmail", "applicantPhone", "idFileFront", "paymentReceipt", "workFile", "reviewNotes"]) assert.equal(submission[key], undefined);
});
for (const [name, change] of [
  ["missing payment screenshot", { paymentReceipt: undefined }],
  ["short payment reference", { paymentRef: "1" }],
  ["numeric payment reference", { paymentRef: 1234 }],
  ["inactive gateway", { paymentGateway: "mtn_cash" }],
  ["missing gateway", { paymentGateway: undefined }],
]) test(`PUT rejects ${name}`, async () => { await put(await seed(), payment("pay_initial", change), 400); });
test("PUT rejects malformed id instead of throwing 500", async () => {
  const response = await citizen.PUT(req("PUT", { id: { not: "valid" }, ...payment() }));
  assert.equal(response.status, 400);
});
test("PUT rejects duplicate transfer on another submission", async () => {
  const a = await seed(), b = await seed(), pay = payment();
  await put(a, pay); await put(b, pay, 409);
});
test("PUT concurrent initial payments produce one success and one conflict", async () => {
  const row = await seed();
  const replies = await Promise.all([citizen.PUT(req("PUT", { id: row.id, ...payment() })), citizen.PUT(req("PUT", { id: row.id, ...payment() }))]);
  assert.deepEqual(replies.map(r => r.status).sort(), [200, 409]);
});
test("PUT cannot pay final before approval or force status", async () => {
  const row = await seed();
  await put(row, payment("pay_final"), 409);
  await put(row, { action: "complete", applicationStatus: "completed" }, 400);
});
test("PUT resubmission cannot delete mandatory identity", async () => {
  await put(await seed({ applicationStatus: "suspended" }), { action: "resubmit", idFileFront: null }, 400);
});
test("PUT resubmission resets old study endorsements and preserves thread", async () => {
  const row = await seed({ applicationStatus: "suspended", paymentStatus: "initial_paid", assessorReportFile: "old", studiesRecommendationsFile: "old",
    reviewNotes: [{ role: "STUDIES_HEAD", text: "old note" }] });
  await put(row, { action: "resubmit", applicantReply: "تم استكمال النواقص", workFile: null, workDriveUrl: "https://drive.google.com/file/d/corrected/view" });
  const updated = await prisma.copyrightSubmission.findUnique({ where: { id: row.id } });
  assert.equal(updated.assessorReportFile, null);
  assert.equal(updated.studiesRecommendationsFile, null);
  assert.equal(updated.reviewNotes.length, 2);
});

test("PATCH legal director cannot skip both study endorsements", async () => {
  await patch(await seed({ applicationStatus: "under_review", paymentStatus: "initial_paid" }), "LEGAL_DIRECTOR", { applicationStatus: "pending_final_approval" }, 409);
});
test("PATCH studies head cannot endorse before assessor", async () => {
  await patch(await seed({ applicationStatus: "under_review", paymentStatus: "initial_paid" }), "STUDIES_HEAD", { applicationStatus: "under_review", studiesRecommendationsFile: "توصية" }, 409);
});
test("PATCH assessor cannot file report before finance", async () => {
  await patch(await seed(), "STUDIES_ASSESSOR", { assessorReportFile: "تقرير" }, 409);
});
test("PATCH rejects blank report", async () => {
  await patch(await seed({ applicationStatus: "under_review", paymentStatus: "initial_paid" }), "STUDIES_ASSESSOR", { assessorReportFile: " " }, 400);
});
test("PATCH rejects non-string note cleanly", async () => {
  await patch(await seed(), "FINANCE", { reviewNote: 123 }, 400);
});
test("PATCH deputy can suspend with required reason", async () => {
  await patch(await seed({ applicationStatus: "pending_final_approval", paymentStatus: "initial_paid" }), "DEPUTY_MINISTER", { applicationStatus: "suspended", deficiencyNote: "نقص موثق" });
});
test("PATCH deputy can reject with required reason", async () => {
  await patch(await seed({ applicationStatus: "pending_final_approval", paymentStatus: "initial_paid" }), "DEPUTY_MINISTER", { applicationStatus: "rejected", deficiencyNote: "سبب موثق" });
});
test("PATCH suspension without reason is rejected", async () => {
  await patch(await seed({ applicationStatus: "under_review" }), "STUDIES_ASSESSOR", { applicationStatus: "suspended" }, 400);
});
for (const role of ["VIEWER", "AUTHOR", "CONTRIBUTOR", "DIRECTORATE", "TICKET_OFFICER", "EDITOR"]) {
  test(`PATCH ${role} cannot approve`, async () => { await patch(await seed(), role, { applicationStatus: "under_review" }, 403); });
}
test("PATCH internal reference cannot be reassigned by another staff member", async () => {
  const row = await seed({ applicationStatus: "under_review" });
  await patch(row, "STUDIES_ASSESSOR", { internalRefNumber: `${prefix}-ref` });
  await patch(row, "ADMIN", { internalRefNumber: "stolen" }, 403);
  await patch(row, "SUPER_ADMIN", { internalRefNumber: `${prefix}-corrected` });
});
test("PATCH completed case is immutable", async () => { await patch(await seed({ applicationStatus: "completed" }), "SUPER_ADMIN", { reviewNote: "edit" }, 409); });
test("GET admin list denies ordinary viewer", async () => {
  globalThis.copyrightAuditSession = { userId: staff.VIEWER.id, role: "VIEWER" };
  assert.equal((await adminList.GET()).status, 403);
});
test("DELETE only super admin may delete; writes audit record", async () => {
  const row = await seed();
  globalThis.copyrightAuditSession = { userId: staff.ADMIN.id, role: "ADMIN" };
  assert.equal((await admin.DELETE(req("DELETE"), { params: Promise.resolve({ id: row.id }) })).status, 403);
  globalThis.copyrightAuditSession = { userId: staff.SUPER_ADMIN.id, role: "SUPER_ADMIN" };
  assert.equal((await admin.DELETE(req("DELETE"), { params: Promise.resolve({ id: row.id }) })).status, 200);
  assert.equal(await prisma.auditLog.count({ where: { targetId: row.id, action: "COPYRIGHT_SUBMISSION_DELETED" } }), 1);
});
for (const [stage, status, paid, expected] of [
  ["initial", "submitted", "pending", 409], ["initial", "finance_review", "initial_paid", 409],
  ["initial", "under_review", "initial_paid", 200], ["final", "final_review", "final_paid", 409],
  ["final", "completed", "fully_paid", 200],
]) test(`receipt ${stage}/${status}/${paid} returns ${expected}`, async () => {
  const row = await seed({ applicationStatus: status, paymentStatus: paid });
  const response = await receipt.GET(req("GET", undefined, `?code=${row.id}&stage=${stage}`));
  assert.equal(response.status, expected);
});
test("initial and final payment references remain separate after completion", async () => {
  const row = await seed(), initial = payment();
  await put(row, initial);
  await patch(row, "FINANCE", { applicationStatus: "under_review" });
  await patch(row, "STUDIES_ASSESSOR", { applicationStatus: "under_review", assessorReportFile: "تقرير فني" });
  await patch(row, "STUDIES_HEAD", { applicationStatus: "under_review", studiesRecommendationsFile: "توصية قانونية" });
  await patch(row, "LEGAL_DIRECTOR", { applicationStatus: "pending_final_approval" });
  await patch(row, "DEPUTY_MINISTER", { applicationStatus: "pending_fees" });
  await put(row, payment("pay_final"));
  await patch(row, "FINANCE", { applicationStatus: "completed" });
  await receipt.GET(req("GET", undefined, `?code=${row.id}&stage=initial`));
  const call = globalThis.copyrightAuditPdfCalls.at(-1);
  assert.equal(call.submission.paymentRef, initial.paymentRef);
  await put(await seed(), { ...initial }, 409);
});
test("final payment cannot reuse same transfer as initial", async () => {
  const ref = randomUUID();
  const row = await seed({ applicationStatus: "pending_fees", paymentStatus: "initial_paid", paymentRef: ref });
  await put(row, payment("pay_final", { paymentRef: ref }), 409);
});
test("copyright email escapes citizen-controlled HTML", async () => {
  await mailer.sendCopyrightEmail({ ...payload({ applicantName: '<img src=x onerror="alert(1)">', workTitle: '<a href="https://attacker.invalid">click</a>' }), id: "audit", referenceNo: "CPR-2026-TEST" });
  const email = capturedEmails.at(-1);
  assert.ok(email);
  assert.ok(!email.html.includes('<img src=x'));
  assert.ok(email.html.includes('&lt;img'));
});

for (const stage of ["initial", "final"]) test(`finance returns ${stage} payment for correction and citizen can retry`, async () => {
  const row = await seed(stage === "final" ? { applicationStatus: "pending_fees", paymentStatus: "initial_paid" } : {});
  const pay = payment(stage === "initial" ? "pay_initial" : "pay_final");
  await put(row, pay);
  await patch(row, "FINANCE", { applicationStatus: stage === "initial" ? "submitted" : "pending_fees", paymentCorrection: true, deficiencyNote: "صورة الحوالة غير واضحة" });
  const returned = await prisma.copyrightSubmission.findUnique({ where: { id: row.id } });
  assert.equal(returned.paymentStatus, stage === "initial" ? "pending" : "initial_paid");
  await put(row, pay);
  await patch(row, "FINANCE", { applicationStatus: stage === "initial" ? "under_review" : "completed" });
});
test("finance can reject an invalid initial claim with reason", async () => {
  const row = await seed(); await put(row, payment());
  await patch(row, "FINANCE", { applicationStatus: "rejected", deficiencyNote: "حوالة غير صحيحة" });
  assert.equal((await receipt.GET(req("GET", undefined, `?code=${row.id}&stage=initial`))).status, 409);
});
test("late assessor cannot reject at legal director stage", async () => {
  await patch(await seed({ applicationStatus: "under_review", assessorReportFile: "report", studiesRecommendationsFile: "recommend" }), "STUDIES_ASSESSOR", { applicationStatus: "rejected", deficiencyNote: "late" }, 409);
});
test("early head cannot reject before assessor", async () => {
  await patch(await seed({ applicationStatus: "under_review" }), "STUDIES_HEAD", { applicationStatus: "rejected", deficiencyNote: "early" }, 409);
});
test("legacy completed tracking exposes final receipt only", async () => {
  const row = await seed({ applicationStatus: "completed", paymentStatus: "fully_paid", paymentRef: randomUUID() });
  const { submission } = await (await citizen.GET(req("GET", undefined, `?code=${row.id}`))).json();
  assert.deepEqual(submission.receipts, { initial: false, final: true });
});
test("simultaneous reuse of one transfer across two cases yields one success", async () => {
  const a = await seed(), b = await seed(), pay = payment();
  const replies = await Promise.all([a,b].map(row => citizen.PUT(req("PUT", { id: row.id, ...pay }))));
  assert.deepEqual(replies.map(r => r.status).sort(), [200,409]);
});
