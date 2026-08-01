import { isDeepStrictEqual } from "node:util";

const ANSWER_FIELD_BY_SCOPE = Object.freeze({
  ELIGIBILITY: "eligibilityAnswers",
  PREMISES: "premisesAnswers",
  EQUIPMENT: "premisesAnswers",
  EVIDENCE: "premisesAnswers",
  BYLAWS: "bylawAnswers",
  POST_LICENSE: "postLicenseDeclarations",
});

const NEVER_MUTABLE_FIELDS = new Set([
  "id",
  "applicationId",
  "referenceNo",
  "accessToken",
  "accessTokenHash",
  "status",
  "revision",
  "createdAt",
  "updatedAt",
  "submittedAt",
  "issuedAt",
  "completedAt",
  "archivedAt",
  "licenseNumber",
  "licenseDate",
]);

function deficiencyList(scopes) {
  return Array.isArray(scopes)
    ? scopes.filter((item) => item && typeof item === "object" && !Array.isArray(item))
    : [];
}

function suspendedScopeError(fields) {
  const error = new Error("Only deficient legal-license fields may be changed while suspended");
  error.code = "LEGAL_LICENSE_SUSPENDED_SCOPE_VIOLATION";
  error.fields = [...new Set(fields)].sort();
  return error;
}

function changedKeys(current = {}, next = {}) {
  return [...new Set([...Object.keys(current || {}), ...Object.keys(next || {})])]
    .filter((key) => !isDeepStrictEqual(current?.[key], next?.[key]));
}

export function allowedSuspendedFields(scopes) {
  const allowed = new Set();
  for (const item of deficiencyList(scopes)) {
    if (typeof item.field === "string" && item.field && !NEVER_MUTABLE_FIELDS.has(item.field)) {
      allowed.add(item.field);
    }
    const answerField = ANSWER_FIELD_BY_SCOPE[item.scope];
    if (answerField && typeof item.requirementKey === "string" && item.requirementKey) {
      allowed.add(answerField);
    }
  }
  return [...allowed].sort();
}

export function assertSuspendedDraftChangesAllowed(current, next, scopes) {
  if (!current || typeof current !== "object" || !next || typeof next !== "object") {
    throw suspendedScopeError(["draft"]);
  }

  const deficiencies = deficiencyList(scopes);
  const explicitFields = new Set(
    deficiencies
      .map((item) => item.field)
      .filter((field) => typeof field === "string" && field && !NEVER_MUTABLE_FIELDS.has(field)),
  );
  const answerKeys = new Map();
  for (const item of deficiencies) {
    const answerField = ANSWER_FIELD_BY_SCOPE[item.scope];
    if (!answerField || typeof item.requirementKey !== "string" || !item.requirementKey) continue;
    if (!answerKeys.has(answerField)) answerKeys.set(answerField, new Set());
    answerKeys.get(answerField).add(item.requirementKey);
  }

  const violations = [];
  for (const field of changedKeys(current, next)) {
    if (NEVER_MUTABLE_FIELDS.has(field)) {
      violations.push(field);
      continue;
    }

    if (answerKeys.has(field)) {
      const currentAnswers = current[field] && typeof current[field] === "object" ? current[field] : {};
      const nextAnswers = next[field] && typeof next[field] === "object" ? next[field] : {};
      for (const key of changedKeys(currentAnswers, nextAnswers)) {
        if (!answerKeys.get(field).has(key)) violations.push(`${field}.${key}`);
      }
      continue;
    }

    if (!explicitFields.has(field)) violations.push(field);
  }

  if (violations.length) throw suspendedScopeError(violations);
  return next;
}

export function assertSuspendedAttachmentAllowed(attachment, scopes) {
  const kind = attachment?.kind;
  const subjectRef = attachment?.subjectRef ?? attachment?.founderId ?? null;
  const allowed = deficiencyList(scopes).some((item) => (
    item.scope === "ATTACHMENT"
    && item.attachmentKind === kind
    && (item.subjectRef ?? null) === subjectRef
  ));

  if (!allowed) {
    const error = new Error("This attachment is not included in the suspended deficiencies");
    error.code = "LEGAL_LICENSE_SUSPENDED_ATTACHMENT_NOT_ALLOWED";
    error.attachmentKind = kind ?? null;
    error.subjectRef = subjectRef;
    throw error;
  }
  return attachment;
}
