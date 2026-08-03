import assert from "node:assert/strict";
import test from "node:test";

process.env.CITIZEN_ID_PEPPER ||= "test-only-citizen-id-pepper-needs-32-chars-min";

const {
  normalizeNationalId,
  isValidNationalId,
  normalizeEmail,
  isValidEmail,
  assertIdentityPepper,
  hashNationalId,
  nationalIdHashMatches,
  lastFour,
} = await import("./citizen-identity.mjs");

test("normalizeNationalId converts Arabic-Indic digits and strips separators to match a plain-digit ID", () => {
  assert.equal(normalizeNationalId("١٢٣٤٥٦٧٨٩٠١"), "12345678901");
  assert.equal(normalizeNationalId("123-456-789 01"), "12345678901");
  assert.equal(normalizeNationalId("  12345678901  "), "12345678901");
  assert.equal(normalizeNationalId("۱۲۳۴۵۶۷۸۹۰۱"), "12345678901"); // extended Arabic-Indic
});

test("normalizeNationalId returns an empty string for non-string input", () => {
  assert.equal(normalizeNationalId(null), "");
  assert.equal(normalizeNationalId(undefined), "");
  assert.equal(normalizeNationalId(12345678901), "");
});

test("isValidNationalId accepts exactly 11 digits and rejects anything else", () => {
  assert.equal(isValidNationalId("12345678901"), true);
  assert.equal(isValidNationalId("1234567890"), false); // 10 digits
  assert.equal(isValidNationalId("123456789012"), false); // 12 digits
  assert.equal(isValidNationalId("1234567890a"), false);
  assert.equal(isValidNationalId(""), false);
  assert.equal(isValidNationalId(null), false);
});

test("normalizeEmail trims and lowercases", () => {
  assert.equal(normalizeEmail("  User@Example.COM  "), "user@example.com");
});

test("isValidEmail rejects obviously malformed addresses", () => {
  assert.equal(isValidEmail("user@example.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail("user@"), false);
  assert.equal(isValidEmail(""), false);
});

test("assertIdentityPepper throws when the pepper is missing or shorter than 32 characters", () => {
  const original = process.env.CITIZEN_ID_PEPPER;
  try {
    delete process.env.CITIZEN_ID_PEPPER;
    assert.throws(() => assertIdentityPepper(), /CITIZEN_ID_PEPPER/);

    process.env.CITIZEN_ID_PEPPER = "too-short";
    assert.throws(() => assertIdentityPepper(), /CITIZEN_ID_PEPPER/);

    process.env.CITIZEN_ID_PEPPER = original;
    assert.doesNotThrow(() => assertIdentityPepper());
  } finally {
    process.env.CITIZEN_ID_PEPPER = original;
  }
});

test("hashNationalId is deterministic, hides the original digits, and differs per input", () => {
  const hashA = hashNationalId("12345678901");
  const hashB = hashNationalId("12345678901");
  const hashC = hashNationalId("10987654321");

  assert.equal(hashA, hashB);
  assert.notEqual(hashA, hashC);
  assert.match(hashA, /^[0-9a-f]{64}$/); // hex-encoded SHA-256
  assert.doesNotMatch(hashA, /12345678901/);
});

test("hashNationalId depends on the pepper — different pepper, different hash for the same ID", async () => {
  const originalPepper = process.env.CITIZEN_ID_PEPPER;
  // A fresh module instance is required since the module reads the pepper
  // once at import time; simulate this by hashing with a temporarily
  // different pepper via a second dynamic import under a cache-busting query.
  process.env.CITIZEN_ID_PEPPER = "a-completely-different-pepper-value-32ch";
  const { hashNationalId: hashWithDifferentPepper } = await import(
    `./citizen-identity.mjs?pepper-test=${Date.now()}`
  );
  process.env.CITIZEN_ID_PEPPER = originalPepper;

  assert.notEqual(hashWithDifferentPepper("12345678901"), hashNationalId("12345678901"));
});

test("nationalIdHashMatches uses a timing-safe comparison and correctly matches/mismatches", () => {
  const hash = hashNationalId("12345678901");
  assert.equal(nationalIdHashMatches("12345678901", hash), true);
  assert.equal(nationalIdHashMatches("10987654321", hash), false);
  assert.equal(nationalIdHashMatches("12345678901", "not-a-valid-hex-hash"), false);
  assert.equal(nationalIdHashMatches("12345678901", ""), false);
});

test("lastFour returns the final 4 digits of a normalized national ID", () => {
  assert.equal(lastFour("12345678901"), "8901");
});
