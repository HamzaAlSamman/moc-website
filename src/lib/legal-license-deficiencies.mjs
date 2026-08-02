import { isDeepStrictEqual } from "node:util";

const ANSWER_FIELD_BY_SCOPE = Object.freeze({
  ELIGIBILITY: "eligibilityAnswers",
  PREMISES: "premisesAnswers",
  EQUIPMENT: "premisesAnswers",
  EVIDENCE: "premisesAnswers",
  BYLAWS: "bylawAnswers",
  POST_LICENSE: "postLicenseDeclarations",
});

const ANSWER_FIELDS = new Set(Object.values(ANSWER_FIELD_BY_SCOPE));

const CITIZEN_EDITABLE_FIELDS = new Set([
  "licenseType",
  "applicantName",
  "nationalId",
  "phone",
  "email",
  "capacity",
  "entityName",
  "purpose",
  "objectives",
  "activityDescription",
  "governorate",
  "address",
  "declarationAccuracy",
  "declarationResponsibility",
  "declarationPrivacy",
  "applicantSignature",
]);

const MANAGER_EDITABLE_FIELDS = new Set([
  "enabled",
  "fullName",
  "nationalId",
  "phone",
  "email",
  "occupation",
  "qualification",
]);

const FOUNDER_EDITABLE_FIELDS = new Set([
  "fullName",
  "nationalId",
  "birthDate",
  "occupation",
  "qualification",
  "phone",
  "email",
  "address",
  "isAuthorizedRepresentative",
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

function normalizedFounderField(item) {
  if (
    item?.scope !== "FOUNDER"
    || typeof item.subjectRef !== "string"
    || !item.subjectRef
    || typeof item.field !== "string"
  ) {
    return null;
  }
  const field = item.field.startsWith("founders.")
    ? item.field.slice("founders.".length)
    : item.field;
  return FOUNDER_EDITABLE_FIELDS.has(field) ? field : null;
}

function normalizedManagerField(item) {
  if (typeof item?.field !== "string" || !item.field.startsWith("managerDetails.")) {
    return null;
  }
  const field = item.field.slice("managerDetails.".length);
  return MANAGER_EDITABLE_FIELDS.has(field) ? field : null;
}

function founderScopeMap(scopes) {
  const allowed = new Map();
  for (const item of deficiencyList(scopes)) {
    const field = normalizedFounderField(item);
    if (!field) continue;
    if (!allowed.has(item.subjectRef)) allowed.set(item.subjectRef, new Set());
    allowed.get(item.subjectRef).add(field);
  }
  return allowed;
}

function founderViolations(currentFounders, nextFounders, scopes) {
  if (!Array.isArray(currentFounders) || !Array.isArray(nextFounders)) {
    return ["founders"];
  }

  const currentIds = currentFounders.map((founder) => founder?.id);
  const nextIds = nextFounders.map((founder) => founder?.id);
  const validCurrentIds = currentIds.every((id) => typeof id === "string" && id);
  const validNextIds = nextIds.every((id) => typeof id === "string" && id);
  const sameOrderAndMembership = (
    validCurrentIds
    && validNextIds
    && new Set(currentIds).size === currentIds.length
    && new Set(nextIds).size === nextIds.length
    && currentIds.length === nextIds.length
    && currentIds.every((id, index) => id === nextIds[index])
  );
  if (!sameOrderAndMembership) return ["founders"];

  const allowed = founderScopeMap(scopes);
  const violations = [];
  for (let index = 0; index < currentFounders.length; index += 1) {
    const founderId = currentIds[index];
    for (const field of changedKeys(currentFounders[index], nextFounders[index])) {
      if (field === "id" || !allowed.get(founderId)?.has(field)) {
        violations.push(`founders.${founderId}.${field}`);
      }
    }
  }
  return violations;
}

export function allowedSuspendedFields(scopes) {
  const allowed = new Set();
  for (const item of deficiencyList(scopes)) {
    if (
      typeof item.field === "string"
      && CITIZEN_EDITABLE_FIELDS.has(item.field)
      && !ANSWER_FIELDS.has(item.field)
    ) {
      allowed.add(item.field);
    }

    const answerField = ANSWER_FIELD_BY_SCOPE[item.scope];
    if (answerField && typeof item.requirementKey === "string" && item.requirementKey) {
      allowed.add(answerField);
    }

    const managerField = normalizedManagerField(item);
    if (managerField) allowed.add("managerDetails." + managerField);

    const founderField = normalizedFounderField(item);
    if (founderField) {
      allowed.add(`founders.${item.subjectRef}.${founderField}`);
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
      .filter((field) => (
        typeof field === "string"
        && CITIZEN_EDITABLE_FIELDS.has(field)
        && !ANSWER_FIELDS.has(field)
      )),
  );
  const answerKeys = new Map();
  for (const item of deficiencies) {
    const answerField = ANSWER_FIELD_BY_SCOPE[item.scope];
    if (!answerField || typeof item.requirementKey !== "string" || !item.requirementKey) continue;
    if (!answerKeys.has(answerField)) answerKeys.set(answerField, new Set());
    answerKeys.get(answerField).add(item.requirementKey);
  }

  const allowedManagerFields = new Set(
    deficiencies.map(normalizedManagerField).filter(Boolean),
  );

  const violations = [];
  for (const field of changedKeys(current, next)) {
    if (field === "managerDetails") {
      const currentManager = current.managerDetails && typeof current.managerDetails === "object"
        ? current.managerDetails
        : { enabled: false };
      const nextManager = next.managerDetails && typeof next.managerDetails === "object"
        ? next.managerDetails
        : { enabled: false };
      const disablingWithPermission = (
        allowedManagerFields.has("enabled")
        && currentManager.enabled === true
        && nextManager.enabled === false
      );
      for (const key of changedKeys(currentManager, nextManager)) {
        if (!allowedManagerFields.has(key) && !(disablingWithPermission && key !== "enabled")) {
          violations.push("managerDetails." + key);
        }
      }
      continue;
    }

    if (field === "founders") {
      violations.push(...founderViolations(current.founders, next.founders, deficiencies));
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
