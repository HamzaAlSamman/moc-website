import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import { legalLicenseError } from "./legal-license-errors.mjs";

test("legal-license error mapper returns safe stable Zod fields without raw messages", () => {
  let error;
  try {
    z.object({ email: z.string().email() }).parse({ email: "secret citizen value" });
  } catch (caught) {
    error = caught;
  }
  const response = legalLicenseError(error);
  assert.equal(response.status, 400);
  assert.equal(response.body.code, "LEGAL_LICENSE_INVALID_REQUEST");
  assert.equal(response.body.error, "Invalid legal-license request");
  assert.deepEqual(response.body.fields, {
    fieldErrors: { email: ["Invalid value"] },
    formErrors: [],
  });
  assert.doesNotMatch(JSON.stringify(response.body), /secret citizen value|Invalid email/i);
});

test("legal-license error mapper preserves sanitized requirement issues", () => {
  const error = new Error("internal detail");
  error.code = "LEGAL_LICENSE_REQUIREMENTS_INCOMPLETE";
  error.issues = [
    { key: "music.building.soundproof_rooms", scope: "PREMISES", internal: "hide" },
    { key: { unsafe: true }, scope: "PREMISES" },
  ];
  const response = legalLicenseError(error);
  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    error: "Legal-license requirements are incomplete",
    message: "Legal-license requirements are incomplete",
    code: "LEGAL_LICENSE_REQUIREMENTS_INCOMPLETE",
    issues: [{ key: "music.building.soundproof_rooms", scope: "PREMISES" }],
  });
});

test("legal-license error mapper returns 413 without exposing oversized request internals", () => {
  const error = new Error("secret body detail");
  error.code = "LEGAL_LICENSE_REQUEST_TOO_LARGE";
  error.status = 413;
  const response = legalLicenseError(error);
  assert.equal(response.status, 413);
  assert.equal(response.body.code, "LEGAL_LICENSE_REQUEST_TOO_LARGE");
  assert.doesNotMatch(JSON.stringify(response.body), /secret body detail/);
});
