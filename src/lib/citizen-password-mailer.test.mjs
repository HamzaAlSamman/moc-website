import assert from "node:assert/strict";
import test from "node:test";

import { createCitizenPasswordMailer } from "./citizen-password-mailer-core.mjs";

test("password reset mail uses the ministry wrapper and the trusted reset URL", async () => {
  let sent;
  const mailer = createCitizenPasswordMailer({
    sendMail: async (message) => { sent = message; },
    wrapMinistryEmail: ({ contentHtml }) => `<ministry>${contentHtml}</ministry>`,
  });
  await mailer.sendPasswordResetEmail({
    to: "citizen@example.com",
    fullName: "<script>alert(1)</script>",
    resetUrl: "https://moc.gov.sy/ar/account/reset?token=safe-token",
    ttlMinutes: 60,
  });

  assert.equal(sent.to, "citizen@example.com");
  assert.match(sent.subject, /كلمة المرور/);
  assert.match(sent.html, /https:\/\/moc\.gov\.sy\/ar\/account\/reset\?token=safe-token/);
  assert.doesNotMatch(sent.html, /<script>/);
  assert.match(sent.html, /60 دقيقة/);
});
