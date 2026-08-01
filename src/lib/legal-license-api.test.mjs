import assert from "node:assert/strict";
import test from "node:test";

import { LEGAL_LICENSE_DOCUMENT_RULES } from "./legal-license.mjs";
import {
  LEGAL_LICENSE_BYLAW_ACKNOWLEDGMENT_KEY,
  LEGAL_LICENSE_POST_LICENSE_DECLARATION_KEY,
} from "./legal-license-requirements.mjs";

import {
  buildRequirementSnapshot,
  evaluateLegalLicenseEligibility,
  normalizeLegalLicenseAnswers,
  legalLicenseApplicationWriteData,
  normalizeLegalLicenseDraft,
  requiredLegalLicenseDocumentKinds,
  validateLegalLicenseGuidedSubmission,
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

test("draft parsing accepts partial guided answers without enforcing submission requirements", () => {
  const draft = normalizeLegalLicenseDraft({
    licenseType: "MUSIC_INSTITUTE",
    premisesAnswers: {},
    postLicenseDeclarations: { [LEGAL_LICENSE_POST_LICENSE_DECLARATION_KEY]: false },
  });

  assert.deepEqual(draft.eligibilityAnswers, {});
  assert.deepEqual(draft.premisesAnswers, {});
  assert.deepEqual(draft.bylawAnswers, {});
  assert.deepEqual(draft.postLicenseDeclarations, { [LEGAL_LICENSE_POST_LICENSE_DECLARATION_KEY]: false });
});

test("legacy nullable guided JSON becomes empty records before structured requirement validation", () => {
  assert.throws(
    () => validateLegalLicenseGuidedSubmission({
      licenseType: "AMATEUR_TROUPE",
      eligibilityAnswers: null,
      premisesAnswers: null,
      bylawAnswers: null,
      postLicenseDeclarations: null,
    }),
    (error) => (
      error.code === "LEGAL_LICENSE_REQUIREMENTS_INCOMPLETE"
      && error.name !== "ZodError"
      && error.issues.some((issue) => (
        issue.key === LEGAL_LICENSE_POST_LICENSE_DECLARATION_KEY
        && issue.scope === "POST_LICENSE"
      ))
    ),
  );
});

test("guided answer records enforce key and string limits without shrinking main draft text", () => {
  assert.doesNotThrow(() => normalizeLegalLicenseDraft({
    licenseType: "AMATEUR_TROUPE",
    purpose: "x".repeat(5_000),
  }));

  assert.throws(
    () => normalizeLegalLicenseDraft({
      licenseType: "CULTURAL_FORUM",
      bylawAnswers: Object.fromEntries(
        Array.from({ length: 101 }, (_, index) => [`answer.${index}`, true]),
      ),
    }),
    (error) => error.name === "ZodError",
  );

  assert.throws(
    () => normalizeLegalLicenseDraft({
      licenseType: "CULTURAL_FORUM",
      bylawAnswers: {
        [LEGAL_LICENSE_BYLAW_ACKNOWLEDGMENT_KEY]: "x".repeat(4_001),
      },
    }),
    (error) => error.name === "ZodError",
  );
});

test("guided answer normalization rejects values that are not JSON-safe scalars", () => {
  assert.throws(
    () => normalizeLegalLicenseAnswers("CULTURAL_FORUM", {
      bylawAnswers: { unsafe: () => true },
    }),
    (error) => error.name === "ZodError",
  );
});

test("guided answer normalization strips unknown and non-applicable requirement keys", () => {
  const answers = normalizeLegalLicenseAnswers("MUSIC_INSTITUTE", {
    eligibilityAnswers: {
      "gallery.applicant.union_member_or_manager_contract": true,
      injected: true,
    },
    premisesAnswers: {
      "music.building.soundproof_rooms": true,
      "theater.building.soundproof_rooms": true,
      injected: "ignore",
    },
  });

  assert.deepEqual(answers.eligibilityAnswers, {});
  assert.deepEqual(answers.premisesAnswers, {
    "music.building.soundproof_rooms": true,
  });
});

test("draft normalization strips bylaw answers from profiles that do not generate bylaws", () => {
  const draft = normalizeLegalLicenseDraft({
    licenseType: "AMATEUR_TROUPE",
    bylawAnswers: { unexpected: true },
    postLicenseDeclarations: { unexpected: true },
  });
  assert.deepEqual(draft.bylawAnswers, {});
  assert.deepEqual(draft.postLicenseDeclarations, {});
});

test("guided submission requires every applicable blocking answer", () => {
  assert.throws(
    () => validateLegalLicenseGuidedSubmission({
      licenseType: "MUSIC_INSTITUTE",
      premisesAnswers: {},
      postLicenseDeclarations: { [LEGAL_LICENSE_POST_LICENSE_DECLARATION_KEY]: true },
    }),
    (error) => {
      assert.equal(error.code, "LEGAL_LICENSE_REQUIREMENTS_INCOMPLETE");
      assert.deepEqual(error.issues, [{
        key: "music.building.soundproof_rooms",
        scope: "PREMISES",
      }]);
      return true;
    },
  );
});

test("a false blocking eligibility answer reports its stable central requirement key", () => {
  const evaluation = evaluateLegalLicenseEligibility("FINE_ARTS_GALLERY", {
    "gallery.applicant.union_member_or_manager_contract": false,
  });
  assert.deepEqual(evaluation, {
    eligible: false,
    issues: [{
      key: "gallery.applicant.union_member_or_manager_contract",
      scope: "ELIGIBILITY",
    }],
  });
});

test("bylaw submissions require the known central acknowledgment only for bylaw profiles", () => {
  for (const licenseType of ["CULTURAL_FORUM", "CULTURAL_ASSOCIATION", "CULTURAL_HOUSE"]) {
    assert.throws(
      () => validateLegalLicenseGuidedSubmission({
        licenseType,
        bylawAnswers: { unexpected: true },
        postLicenseDeclarations: { [LEGAL_LICENSE_POST_LICENSE_DECLARATION_KEY]: true },
      }),
      (error) => error.code === "LEGAL_LICENSE_REQUIREMENTS_INCOMPLETE"
        && error.issues.some((issue) => (
          issue.key === LEGAL_LICENSE_BYLAW_ACKNOWLEDGMENT_KEY
          && issue.scope === "BYLAWS"
        )),
    );
    assert.doesNotThrow(() => validateLegalLicenseGuidedSubmission({
      licenseType,
      bylawAnswers: { [LEGAL_LICENSE_BYLAW_ACKNOWLEDGMENT_KEY]: true },
      postLicenseDeclarations: { [LEGAL_LICENSE_POST_LICENSE_DECLARATION_KEY]: true },
    }));
  }

  const amateur = validateLegalLicenseGuidedSubmission({
    licenseType: "AMATEUR_TROUPE",
    bylawAnswers: { unexpected: true },
    postLicenseDeclarations: { [LEGAL_LICENSE_POST_LICENSE_DECLARATION_KEY]: true },
  });
  assert.deepEqual(amateur.bylawAnswers, {});
});

test("submission requires the known post-license declaration and rejects unknown or false values", () => {
  for (const postLicenseDeclarations of [
    {},
    { unexpected: true },
    { [LEGAL_LICENSE_POST_LICENSE_DECLARATION_KEY]: false },
  ]) {
    assert.throws(
      () => validateLegalLicenseGuidedSubmission({
        licenseType: "AMATEUR_TROUPE",
        postLicenseDeclarations,
      }),
      (error) => error.code === "LEGAL_LICENSE_REQUIREMENTS_INCOMPLETE"
        && error.issues.some((issue) => issue.scope === "POST_LICENSE"),
    );
  }

  assert.doesNotThrow(() => validateLegalLicenseGuidedSubmission({
    licenseType: "AMATEUR_TROUPE",
    postLicenseDeclarations: { [LEGAL_LICENSE_POST_LICENSE_DECLARATION_KEY]: true },
  }));
});

test("requirement snapshots contain only the selected profile's applicable stable requirements", () => {
  const snapshot = buildRequirementSnapshot("MUSIC_INSTITUTE");
  assert.equal(snapshot.licenseType, "MUSIC_INSTITUTE");
  assert.equal(snapshot.templateVersion, "guided-v1");
  assert.deepEqual(snapshot.requirements.map((item) => item.key), [
    "music.building.soundproof_rooms",
    LEGAL_LICENSE_POST_LICENSE_DECLARATION_KEY,
  ]);
});

test("application write data keeps every Prisma-backed guided record and excludes relation input", () => {
  const data = legalLicenseApplicationWriteData({
    licenseType: "CULTURAL_FORUM",
    founders: [{ fullName: "Founder" }],
    eligibilityAnswers: { unexpected: true },
    premisesAnswers: { unexpected: true },
    bylawAnswers: { [LEGAL_LICENSE_BYLAW_ACKNOWLEDGMENT_KEY]: true },
    postLicenseDeclarations: { [LEGAL_LICENSE_POST_LICENSE_DECLARATION_KEY]: true },
  });

  assert.equal(Object.hasOwn(data, "founders"), false);
  assert.deepEqual(data.eligibilityAnswers, {});
  assert.deepEqual(data.premisesAnswers, {});
  assert.deepEqual(data.bylawAnswers, { [LEGAL_LICENSE_BYLAW_ACKNOWLEDGMENT_KEY]: true });
  assert.deepEqual(data.postLicenseDeclarations, {
    [LEGAL_LICENSE_POST_LICENSE_DECLARATION_KEY]: true,
  });
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
    bylawAnswers: { [LEGAL_LICENSE_BYLAW_ACKNOWLEDGMENT_KEY]: true },
    postLicenseDeclarations: { [LEGAL_LICENSE_POST_LICENSE_DECLARATION_KEY]: true },
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
