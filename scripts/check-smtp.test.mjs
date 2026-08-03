import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateSmtpTestRecipient } from "./check-smtp-core.mjs";

test("SMTP check requires a single valid controlled recipient", () => {
  assert.equal(validateSmtpTestRecipient(" ops@example.gov.sy "), "ops@example.gov.sy");
  assert.throws(() => validateSmtpTestRecipient(""), /SMTP_TEST_TO/);
  assert.throws(() => validateSmtpTestRecipient("not-an-email"), /SMTP_TEST_TO/);
  assert.throws(() => validateSmtpTestRecipient("one@example.com,two@example.com"), /SMTP_TEST_TO/);
});

test("SMTP check reuses the shared mailer instead of creating a transport", async () => {
  const source = await readFile(new URL("./check-smtp.mjs", import.meta.url), "utf8");
  assert.match(source, /src\/lib\/mailer\.js/);
  assert.match(source, /sendMail/);
  assert.doesNotMatch(source, /nodemailer|createTransport/);
});
