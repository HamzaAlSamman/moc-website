import assert from "node:assert/strict";
import test from "node:test";

import { LEGAL_LICENSE_DOCUMENT_RULES } from "./legal-license.mjs";

import {
  normalizeLegalLicenseDraft,
  requiredLegalLicenseDocumentKinds,
  validateLegalLicenseSubmissionRecord,
} from "./legal-license-api.mjs";

test("draft parsing keeps only known fields and supplies safe empty defaults", () => {
  const draft = normalizeLegalLicenseDraft({
    licenseType: "CULTURAL_FORUM",
    applicantName: "  Applicant  ",
    email: "CITIZEN@EXAMPLE.COM",
    injected: "ignore me",
    founders: [],
  });
  assert.equal(draft.applicantName, "Applicant");
  assert.equal(draft.email, "citizen@example.com");
  assert.equal(draft.entityName, "");
  assert.equal(Object.hasOwn(draft, "injected"), false);
});

test("required document kinds combine shared and license-specific requirements", () => {
  const forum = requiredLegalLicenseDocumentKinds("CULTURAL_FORUM");
  assert.ok(forum.includes("NATIONAL_ID_FRONT"));
  assert.ok(forum.includes("AUTHORIZATION"));
  assert.ok(forum.includes("FOUNDERS_MINUTES"));
  assert.ok(forum.includes("ACTIVITY_PLAN"));
  assert.equal(new Set(forum).size, forum.length);
});

test("submission validation rejects missing required attachments", () => {
  const record = {
    licenseType: "CULTURAL_FORUM",
    applicantName: "Applicant Name",
    nationalId: "01234567890",
    phone: "0999999999",
    email: "citizen@example.com",
    capacity: "Founder",
    entityName: "Culture Forum",
    purpose: "A clear purpose",
    objectives: "Clear objectives",
    activityDescription: "Cultural activities",
    governorate: "Damascus",
    address: "Main street",
    declarationAccuracy: true,
    declarationResponsibility: true,
    declarationPrivacy: true,
    applicantSignature: "data:image/png;base64,abc",
    founders: [{
      id: "founder-1",
      fullName: "Founder One",
      nationalId: "12345678901",
      isAuthorizedRepresentative: true,
    }],
    attachments: [],
  };
  assert.throws(() => validateLegalLicenseSubmissionRecord(record), /missing required attachments/i);
  record.attachments = requiredLegalLicenseDocumentKinds(record.licenseType).map((kind) => ({
    kind,
    founderId: LEGAL_LICENSE_DOCUMENT_RULES[kind]?.owner === "FOUNDER" ? "founder-1" : null,
  }));
  assert.doesNotThrow(() => validateLegalLicenseSubmissionRecord(record));
});
