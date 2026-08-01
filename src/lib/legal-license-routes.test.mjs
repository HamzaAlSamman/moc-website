import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("citizen legal-license routes expose draft, tracking, attachment, PDF and submit handlers", () => {
  assert.match(read("../app/api/legal-licenses/route.js"), /export async function POST/);
  assert.match(read("../app/api/legal-licenses\/track\/route.js"), /export async function POST/);
  assert.match(read("../app/api/legal-licenses\/[id]\/route.js"), /export async function PUT/);
  assert.match(read("../app/api/legal-licenses\/[id]\/attachments\/route.js"), /validateLegalLicenseUpload/);
  assert.match(read("../app/api/legal-licenses\/[id]\/submit\/route.js"), /generateLegalLicensePdf/);
  assert.match(read("../app/api/legal-licenses\/[id]\/submit\/route.js"), /APPLICATION_PDF/);
});

test("admin legal-license routes provide list/detail/workflow and never hard-delete", () => {
  const list = read("../app/api/admin/legal-licenses/route.js");
  const detail = read("../app/api/admin/legal-licenses/[id]/route.js");
  assert.match(list, /export async function GET/);
  assert.match(detail, /export async function GET/);
  assert.match(detail, /export async function PATCH/);
  assert.doesNotMatch(list + detail, /export async function DELETE/);
  assert.match(detail, /canTransitionLegalLicense/);
  assert.match(detail, /status: 409/);
});

test("public and admin legal-license pages are present", () => {
  assert.match(read("../app/[locale]/services/legal-licenses/page.js"), /LEGAL_LICENSE_TYPES/);
  assert.match(read("../app/admin/legal-licenses/page.js"), /LegalLicense/);
  assert.match(read("../app/admin/legal-licenses/[id]/page.js"), /LegalLicense/);
});
test("citizen resume keeps the secret token and reopens editable drafts", () => {
  const page = read("../app/[locale]/services/legal-licenses/page.js");
  assert.match(page, /TRACKING_KEY/);
  assert.match(page, /resumeApplication/);
  assert.match(page, /application\?\.referenceNo/);
  assert.match(page, /token/);
  assert.match(read("../app/[locale]/services/legal-licenses/gate/page.js"), /window\.location\.hash/);
});

test("citizen writes and submissions use atomic revisions", () => {
  const draft = read("../app/api/legal-licenses/[id]/route.js");
  const submit = read("../app/api/legal-licenses/[id]/submit/route.js");
  const upload = read("../app/api/legal-licenses/[id]/attachments/route.js");
  const remove = read("../app/api/legal-licenses/[id]/attachments/[attachmentId]/route.js");
  assert.match(draft, /revision:\s*\{\s*increment:\s*1/);
  assert.match(submit, /expectedUpdatedAt/);
  assert.match(submit, /updatedAt:\s*application\.updatedAt/);
  assert.match(upload, /revision:\s*\{\s*increment:\s*1/);
  assert.match(remove, /revision:\s*\{\s*increment:\s*1/);
});

test("upload routes bound request bodies before parsing and restrict signed licenses", () => {
  const citizen = read("../app/api/legal-licenses/[id]/attachments/route.js");
  const admin = read("../app/api/admin/legal-licenses/[id]/attachments/route.js");
  assert.match(citizen, /legalLicenseUploadRequestTooLarge/);
  assert.match(admin, /legalLicenseUploadRequestTooLarge/);
  assert.match(admin, /LICENSING_OFFICER/);
  assert.match(admin, /SUPER_ADMIN/);
});
test("citizen create and update routes persist drafts through the Prisma-safe write helper", () => {
  const create = read("../app/api/legal-licenses/route.js");
  const update = read("../app/api/legal-licenses/[id]/route.js");
  for (const source of [create, update]) {
    assert.match(source, /legalLicenseApplicationWriteData/);
    assert.match(source, /applicationData = legalLicenseApplicationWriteData[(]draft[)]/);
  }
});

test("submission preserves structured guided-requirement errors through the safe mapper", () => {
  const submit = read("../app/api/legal-licenses/[id]/submit/route.js");
  const errors = read("./legal-license-errors.mjs");
  assert.match(submit, /legalLicenseError/);
  assert.match(errors, /LEGAL_LICENSE_REQUIREMENTS_INCOMPLETE/);
  assert.match(errors, /issues: safeRequirementIssues[(]error[.]issues[)]/);
  assert.match(errors, /400/);
});
test("citizen JSON routes use the bounded reader and safe error mapper", () => {
  const sources = [
    read("../app/api/legal-licenses/route.js"),
    read("../app/api/legal-licenses/[id]/route.js"),
    read("../app/api/legal-licenses/[id]/submit/route.js"),
  ];
  for (const source of sources) {
    assert.match(source, /readLegalLicenseJson/);
    assert.doesNotMatch(source, /request[.]json[(]/);
    assert.match(source, /legalLicenseError/);
  }
});
