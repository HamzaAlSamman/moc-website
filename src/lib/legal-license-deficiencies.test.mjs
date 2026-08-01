import assert from "node:assert/strict";
import test from "node:test";

import {
  allowedSuspendedFields,
  assertSuspendedAttachmentAllowed,
  assertSuspendedDraftChangesAllowed,
} from "./legal-license-deficiencies.mjs";

const scopes = [
  {
    scope: "PREMISES",
    requirementKey: "music.building.soundproof_rooms",
  },
  {
    scope: "APPLICANT",
    requirementKey: "applicant.phone",
    field: "phone",
  },
  {
    scope: "ATTACHMENT",
    requirementKey: "attachment.SAFETY_APPROVAL",
    attachmentKind: "SAFETY_APPROVAL",
  },
];

test("allowed suspended fields are derived from structured deficiency scopes", () => {
  assert.deepEqual(allowedSuspendedFields(scopes), ["phone", "premisesAnswers"]);
});

test("suspended updates allow only deficient fields and answer keys", () => {
  const current = {
    id: "application-1",
    referenceNo: "LIC-2026-0001",
    revision: 3,
    status: "SUSPENDED",
    phone: "0999999999",
    email: "old@example.com",
    premisesAnswers: {
      "music.building.soundproof_rooms": false,
      "music.building.other": true,
    },
  };

  assert.doesNotThrow(() => assertSuspendedDraftChangesAllowed(current, {
    ...current,
    phone: "0988888888",
    premisesAnswers: {
      ...current.premisesAnswers,
      "music.building.soundproof_rooms": true,
    },
  }, scopes));

  assert.throws(
    () => assertSuspendedDraftChangesAllowed(current, { ...current, email: "new@example.com" }, scopes),
    (error) => error.code === "LEGAL_LICENSE_SUSPENDED_SCOPE_VIOLATION"
      && error.fields.includes("email"),
  );

  assert.throws(
    () => assertSuspendedDraftChangesAllowed(current, {
      ...current,
      premisesAnswers: {
        ...current.premisesAnswers,
        "music.building.other": false,
      },
    }, scopes),
    (error) => error.code === "LEGAL_LICENSE_SUSPENDED_SCOPE_VIOLATION"
      && error.fields.includes("premisesAnswers.music.building.other"),
  );
});

test("suspended updates never permit identity, token, status, or revision changes", () => {
  const current = {
    id: "application-1",
    referenceNo: "LIC-2026-0001",
    accessTokenHash: "secret-hash",
    revision: 3,
    status: "SUSPENDED",
    phone: "0999999999",
  };

  for (const [field, value] of [
    ["id", "other-id"],
    ["referenceNo", "LIC-2026-9999"],
    ["accessTokenHash", "other-secret"],
    ["status", "COMPLETED"],
    ["revision", 4],
  ]) {
    assert.throws(
      () => assertSuspendedDraftChangesAllowed(current, { ...current, [field]: value }, [
        { scope: "APPLICANT", requirementKey: `applicant.${field}`, field },
      ]),
      (error) => error.code === "LEGAL_LICENSE_SUSPENDED_SCOPE_VIOLATION"
        && error.fields.includes(field),
      field,
    );
  }
});

test("suspended attachment replacement is limited to deficient kinds and subject refs", () => {
  const attachmentScopes = [
    {
      scope: "ATTACHMENT",
      requirementKey: "attachment.SAFETY_APPROVAL",
      attachmentKind: "SAFETY_APPROVAL",
    },
    {
      scope: "ATTACHMENT",
      requirementKey: "attachment.NATIONAL_ID_FRONT:founder-1",
      attachmentKind: "NATIONAL_ID_FRONT",
      subjectRef: "founder-1",
    },
  ];

  assert.doesNotThrow(() => assertSuspendedAttachmentAllowed(
    { kind: "SAFETY_APPROVAL", founderId: null },
    attachmentScopes,
  ));
  assert.doesNotThrow(() => assertSuspendedAttachmentAllowed(
    { kind: "NATIONAL_ID_FRONT", founderId: "founder-1" },
    attachmentScopes,
  ));
  assert.throws(
    () => assertSuspendedAttachmentAllowed({ kind: "FLOOR_PLAN", founderId: null }, attachmentScopes),
    (error) => error.code === "LEGAL_LICENSE_SUSPENDED_ATTACHMENT_NOT_ALLOWED",
  );
  assert.throws(
    () => assertSuspendedAttachmentAllowed(
      { kind: "NATIONAL_ID_FRONT", founderId: "founder-2" },
      attachmentScopes,
    ),
    (error) => error.code === "LEGAL_LICENSE_SUSPENDED_ATTACHMENT_NOT_ALLOWED",
  );
});
test("unknown top-level fields remain denied even when a deficiency names them", () => {
  const current = { status: "SUSPENDED", phone: "0999999999" };
  assert.throws(
    () => assertSuspendedDraftChangesAllowed(
      current,
      { ...current, futureAdministrativeField: "changed" },
      [{
        scope: "APPLICANT",
        requirementKey: "applicant.future",
        field: "futureAdministrativeField",
      }],
    ),
    (error) => (
      error.code === "LEGAL_LICENSE_SUSPENDED_SCOPE_VIOLATION"
      && error.fields.includes("futureAdministrativeField")
    ),
  );
});

test("founder deficiency scopes allow one field on one existing founder only", () => {
  const founder1 = {
    id: "founder-1",
    fullName: "Founder One",
    phone: "0999999991",
    email: "one@example.com",
    isAuthorizedRepresentative: true,
  };
  const founder2 = {
    id: "founder-2",
    fullName: "Founder Two",
    phone: "0999999992",
    email: "two@example.com",
    isAuthorizedRepresentative: false,
  };
  const current = {
    status: "SUSPENDED",
    founders: [founder1, founder2],
  };
  const phoneScope = [{
    scope: "FOUNDER",
    requirementKey: "founder.phone",
    subjectRef: "founder-1",
    field: "phone",
  }];

  assert.doesNotThrow(() => assertSuspendedDraftChangesAllowed(current, {
    ...current,
    founders: [{ ...founder1, phone: "0988888888" }, founder2],
  }, phoneScope));

  const forbiddenCandidates = [
    {
      label: "another founder",
      founders: [founder1, { ...founder2, phone: "0988888888" }],
    },
    {
      label: "another field",
      founders: [{ ...founder1, email: "changed@example.com" }, founder2],
    },
    {
      label: "representative",
      founders: [{ ...founder1, isAuthorizedRepresentative: false }, founder2],
    },
    {
      label: "delete",
      founders: [founder1],
    },
    {
      label: "add",
      founders: [founder1, founder2, { id: "founder-3", fullName: "Founder Three" }],
    },
    {
      label: "reorder",
      founders: [founder2, founder1],
    },
  ];
  for (const candidate of forbiddenCandidates) {
    assert.throws(
      () => assertSuspendedDraftChangesAllowed(
        current,
        { ...current, founders: candidate.founders },
        phoneScope,
      ),
      (error) => error.code === "LEGAL_LICENSE_SUSPENDED_SCOPE_VIOLATION",
      candidate.label,
    );
  }

  assert.throws(
    () => assertSuspendedDraftChangesAllowed(current, {
      ...current,
      founders: [{ ...founder1, email: "changed@example.com" }, founder2],
    }, [{
      scope: "APPLICANT",
      requirementKey: "applicant.founders",
      field: "founders",
    }]),
    (error) => error.code === "LEGAL_LICENSE_SUSPENDED_SCOPE_VIOLATION",
  );
});

test("founder representative changes require an exact founder scope", () => {
  const current = {
    status: "SUSPENDED",
    founders: [
      { id: "founder-1", isAuthorizedRepresentative: true },
      { id: "founder-2", isAuthorizedRepresentative: false },
    ],
  };
  assert.doesNotThrow(() => assertSuspendedDraftChangesAllowed(current, {
    ...current,
    founders: [
      { id: "founder-1", isAuthorizedRepresentative: false },
      { id: "founder-2", isAuthorizedRepresentative: false },
    ],
  }, [{
    scope: "FOUNDER",
    requirementKey: "founder.authorized_representative",
    subjectRef: "founder-1",
    field: "founders.isAuthorizedRepresentative",
  }]));
});


test("suspended manager deficiencies allow only the exact nested manager field", () => {
  const current = {
    licenseType: "CULTURAL_FORUM",
    managerDetails: {
      enabled: true,
      fullName: "Manager",
      nationalId: "23456789012",
      phone: "+963944444444",
      email: "manager@example.com",
      occupation: "Director",
      qualification: "Law",
    },
  };
  const scopes = [{ scope: "APPLICANT", field: "managerDetails.phone" }];
  assert.deepEqual(allowedSuspendedFields(scopes), ["managerDetails.phone"]);
  assert.doesNotThrow(() => assertSuspendedDraftChangesAllowed(
    current,
    { ...current, managerDetails: { ...current.managerDetails, phone: "+963955555555" } },
    scopes,
  ));
  assert.throws(
    () => assertSuspendedDraftChangesAllowed(
      current,
      { ...current, managerDetails: { ...current.managerDetails, email: "other@example.com" } },
      scopes,
    ),
    (error) => error.code === "LEGAL_LICENSE_SUSPENDED_SCOPE_VIOLATION"
      && error.fields.includes("managerDetails.email"),
  );
});
