import assert from "node:assert/strict";
import test from "node:test";

import { createCitizenMailer } from "./citizen-mailer-core.mjs";

test("OTP email uses the ministry wrapper and sends the configured six-digit code", async () => {
  const sent = [];
  const wrapped = [];
  const mailer = createCitizenMailer({
    sendMail: async (message) => {
      sent.push(message);
      return { messageId: "smtp-mock-1" };
    },
    wrapMinistryEmail: (input) => {
      wrapped.push(input);
      return `<ministry>${input.contentHtml}</ministry>`;
    },
  });

  const result = await mailer.sendCitizenOtpEmail({
    to: "citizen@example.com",
    code: "004217",
    ttlSeconds: 600,
  });

  assert.deepEqual(result, { messageId: "smtp-mock-1" });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "citizen@example.com");
  assert.match(sent[0].subject, /تفعيل/);
  assert.match(sent[0].html, /004217/);
  assert.match(sent[0].html, /10 دقائق/);
  assert.equal(wrapped.length, 1);
  assert.equal(wrapped[0].directorate, "منصة الخدمات الإلكترونية");
});

test("OTP email rejects malformed codes and never needs identity data", async () => {
  let calls = 0;
  const mailer = createCitizenMailer({
    sendMail: async () => {
      calls += 1;
    },
    wrapMinistryEmail: ({ contentHtml }) => contentHtml,
  });

  await assert.rejects(
    mailer.sendCitizenOtpEmail({ to: "citizen@example.com", code: "12345", ttlSeconds: 600 }),
    /six digits/i,
  );
  assert.equal(calls, 0);
  assert.equal(mailer.sendCitizenOtpEmail.length, 1);
});

test("OTP email escapes recipient-controlled display text", async () => {
  let delivered;
  const mailer = createCitizenMailer({
    sendMail: async (message) => {
      delivered = message;
    },
    wrapMinistryEmail: ({ contentHtml }) => contentHtml,
  });

  await mailer.sendCitizenOtpEmail({
    to: "citizen@example.com",
    code: "123456",
    ttlSeconds: 90,
    fullName: '<img src=x onerror="alert(1)">',
  });

  assert.doesNotMatch(delivered.html, /<img/);
  assert.match(delivered.html, /&lt;img/);
  assert.match(delivered.html, /دقيقتين/);
});
