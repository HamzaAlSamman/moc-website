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
