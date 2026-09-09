import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { GENERIC_EMAIL, OUTBOX_STATUS_LABELS, isGenericEmail, outboxTypeLabel } from "./notification-outbox-core.mjs";

const lib = (...parts) => path.join(process.cwd(), "src", "lib", ...parts);
const read = (file) => readFile(file, "utf8");

// Every citizen-facing email now leaves a row behind. The value of that is only
// as good as its coverage: one module still holding a private transport, or
// still calling the raw sender, is a whole service missing from the audit.
test("no mailer sends outside the queue", async () => {
  const senders = [
    "citizen-mailer.js",
    "citizen-password-mailer.js",
    "legal-license-mailer.js",
    "copyright-mailer.js",
    "queued-mail.js",
  ];
  for (const file of senders) {
    const source = await read(lib(file));
    assert.match(source, /sendMailQueued/, `${file} must send through the queue`);
    assert.doesNotMatch(
      source,
      /nodemailer\.createTransport/,
      `${file} must not build its own SMTP transport — that is how copyright mail escaped the audit`,
    );
  }
});

test("copyright mail no longer carries a second copy of the SMTP config", async () => {
  const source = await read(lib("copyright-mailer.js"));
  assert.doesNotMatch(source, /SMTP_HOST/);
  assert.doesNotMatch(source, /import nodemailer/);
});

test("acknowledgements are queued, and their callers follow", async () => {
  const queued = await read(lib("queued-mail.js"));
  assert.match(queued, /export async function sendCitizenAck/);
  // Faithful to the message it replaced: the reference table and the bolded
  // name are what the citizen has been receiving.
  assert.match(queued, /الرقم المرجعي \/ Reference:/);
  assert.match(queued, /عزيزنا <strong>/);

  const callers = [
    ["app", "api", "contact", "route.js"],
    ["app", "api", "cooperation-contact", "route.js"],
    ["app", "api", "event-submissions", "route.js"],
    ["app", "api", "oversight-complaints", "route.js"],
  ];
  for (const parts of callers) {
    const source = await read(path.join(process.cwd(), "src", ...parts));
    assert.match(source, /from "@\/lib\/queued-mail"/, `${parts.join("/")} still imports the unqueued sender`);
  }

  // mailer.js keeps only the low-level primitives.
  const mailer = await read(lib("mailer.js"));
  assert.doesNotMatch(mailer, /export async function sendCitizenAck/);
  assert.match(mailer, /export async function sendMail/);
});

test("a queued email is replayed, never re-rendered", () => {
  assert.equal(isGenericEmail(GENERIC_EMAIL), true);
  assert.equal(isGenericEmail("BOOKING_CONFIRMED"), false);
  // The stored label wins so the audit screen reads in Arabic; the raw type is
  // the last resort for a notification added before it gets a label.
  assert.equal(outboxTypeLabel({ type: GENERIC_EMAIL, kindAr: "تأكيد استلام طلب" }), "تأكيد استلام طلب");
  assert.equal(outboxTypeLabel({ type: "BOOKING_CONFIRMED" }), "تأكيد حجز");
  assert.equal(outboxTypeLabel({ type: "SOMETHING_NEW" }), "SOMETHING_NEW");
  assert.equal(OUTBOX_STATUS_LABELS.PENDING, "بانتظار الإرسال");
});

test("the audit list never loads a stored attachment", async () => {
  const page = await read(path.join(process.cwd(), "src", "app", "admin", "emails", "page.js"));
  assert.match(page, /payloadJson is deliberately never selected/);
  assert.doesNotMatch(page, /payloadJson: true/);
  assert.match(page, /VIEW_EMAIL_OUTBOX/);
});

test("resending is gated and origin-checked", async () => {
  const route = await read(path.join(process.cwd(), "src", "app", "api", "admin", "emails", "route.js"));
  assert.match(route, /MANAGE_EMAIL_OUTBOX/);
  assert.match(route, /verifyTrustedOrigin/);
  // A manual run must stay bounded: a booking confirmation renders a PDF.
  assert.match(route, /MANUAL_RUN_BATCH = \d+/);
});

test("a manual retry clears the exhausted attempt counter", async () => {
  const source = await read(lib("notification-outbox.js"));
  assert.match(source, /status: \{ in: \["PENDING", "FAILED"\] \}/);
  assert.match(source, /attempts: 0/);
  // Single-row delivery reuses the worker's claim, so immediate sends and the
  // cron cannot race into a double delivery.
  assert.match(source, /onlyId \? Prisma\.sql`AND "id" = \$\{onlyId\}` : Prisma\.empty/);
});
