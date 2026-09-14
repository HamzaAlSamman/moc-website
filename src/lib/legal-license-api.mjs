import { z } from "zod";
import {
  LEGAL_LICENSE_DOCUMENT_RULES,
  LEGAL_LICENSE_TYPES,
  isValidLegalLicenseEmail,
  isValidLegalLicenseNationalId,
  isValidLegalLicensePhone,
  normalizeLegalLicensePhone,
  requiredLegalLicenseDocumentKinds,
  validateLegalLicenseApplication,
} from "./legal-license.mjs";
import {
  getApplicableLegalLicenseRequirements,
  getLegalLicenseRequirementProfile,
} from "./legal-license-requirements.mjs";

const text = (max = 500) => z.string().trim().max(max).optional().default("");
const optionalEmail = z.string().trim().max(320).optional().default("").transform((value) => value.toLowerCase());
const managerDetailsSchema = z.object({
  enabled: z.boolean().optional().default(false),
  fullName: text(300),
  nationalId: text(32),
  phone: text(32),
  email: optionalEmail,
  occupation: text(300),
  qualification: text(300),
}).strip().nullish().transform((manager) => {
  if (manager?.enabled !== true) return { enabled: false };
  return {
    enabled: true,
    fullName: manager.fullName,
    nationalId: manager.nationalId,
    phone: manager.phone,
    email: manager.email,
    occupation: manager.occupation,
    qualification: manager.qualification,
  };
});

const licenseTypes = Object.keys(LEGAL_LICENSE_TYPES);
const answerKey = z.string().trim().min(1).max(256)
  .refine((key) => !["__proto__", "prototype", "constructor"].includes(key), "Unsafe answer key");
const jsonAnswerValue = z.union([
  z.boolean(),
  z.string().max(4_000),
  z.number().finite(),
  z.null(),
]);
const jsonSafeRecord = z.record(answerKey, jsonAnswerValue)
  .refine((record) => Object.keys(record).length <= 100, "Too many answer keys")
  .nullish()
  .transform((record) => record ?? {});
const guidedAnswerRecordFields = {
  eligibilityAnswers: jsonSafeRecord,
  premisesAnswers: jsonSafeRecord,
  bylawAnswers: jsonSafeRecord,
  postLicenseDeclarations: jsonSafeRecord,
};
const guidedAnswersSchema = z.object(guidedAnswerRecordFields).strip();

const founderDraftSchema = z.object({
  id: z.string().trim().max(128).optional(),
  fullName: text(300),
  nationalId: text(32),
  birthDate: z.string().trim().max(32).nullable().optional(),
  nationality: text(200),
  occupation: text(300),
  qualification: text(300),
  phone: text(32),
  email: optionalEmail,
  address: text(2_000),
  visualSignature: z.string().max(2_000_000).nullable().optional().default(null),
  isAuthorizedRepresentative: z.boolean().optional().default(false),
}).strip();

export const legalLicenseDraftSchema = z.object({
  licenseType: z.enum(licenseTypes),
  applicantName: text(300),
  nationalId: text(32),
  phone: text(32),
  email: optionalEmail,
  capacity: text(300),
  entityName: text(500),
  objectives: text(20_000),
  activityDescription: text(20_000),
  governorate: text(200),
  address: text(3_000),
  declarationAccuracy: z.boolean().optional().default(false),
  declarationResponsibility: z.boolean().optional().default(false),
  declarationPrivacy: z.boolean().optional().default(false),
  applicantSignature: z.string().max(2_000_000).nullable().optional().default(null),
  founders: z.array(founderDraftSchema).max(100).optional().default([]),
  managerDetails: managerDetailsSchema,
  ...guidedAnswerRecordFields,
}).strip();

function copyAllowedAnswers(record, allowedKeys) {
  return Object.fromEntries(
    Object.entries(record || {}).filter(([key]) => allowedKeys.has(key)),
  );
}

function requirementAnswerRecord(requirement) {
  return requirement.category === "ELIGIBILITY"
    ? "eligibilityAnswers"
    : requirement.category === "BYLAWS"
      ? "bylawAnswers"
      : requirement.category === "POST_LICENSE"
        ? "postLicenseDeclarations"
        : "premisesAnswers";
}

function answerSatisfiesRequirement(requirement, value) {
  if (requirement.answerType === "BOOLEAN") return value === true;
  if (requirement.answerType === "NUMBER") return typeof value === "number" && Number.isFinite(value);
  return typeof value === "string" && value.trim().length > 0;
}

function requirementIssue(requirement) {
  return { key: requirement.key, scope: requirement.category };
}

function incompleteRequirements(issues) {
  const error = new Error("Legal-license requirements are incomplete");
  error.code = "LEGAL_LICENSE_REQUIREMENTS_INCOMPLETE";
  error.issues = issues;
  return error;
}

export function normalizeLegalLicenseAnswers(licenseType, input = {}, context = input) {
  const profile = getLegalLicenseRequirementProfile(licenseType);
  if (!profile) throw new Error("Invalid legal-license type");
  const parsed = guidedAnswersSchema.parse(input);

  const applicable = getApplicableLegalLicenseRequirements(licenseType, context);
  const eligibilityKeys = new Set(
    applicable.filter((item) => item.category === "ELIGIBILITY").map((item) => item.key),
  );
  const premisesKeys = new Set(
    applicable
      .filter((item) => !["ELIGIBILITY", "BYLAWS", "POST_LICENSE"].includes(item.category))
      .map((item) => item.key),
  );
  const bylawKeys = new Set(
    applicable.filter((item) => item.category === "BYLAWS").map((item) => item.key),
  );
  const postLicenseKeys = new Set(
    applicable.filter((item) => item.category === "POST_LICENSE").map((item) => item.key),
  );

  return {
    eligibilityAnswers: copyAllowedAnswers(parsed.eligibilityAnswers, eligibilityKeys),
    premisesAnswers: copyAllowedAnswers(parsed.premisesAnswers, premisesKeys),
    bylawAnswers: copyAllowedAnswers(parsed.bylawAnswers, bylawKeys),
    postLicenseDeclarations: copyAllowedAnswers(
      parsed.postLicenseDeclarations,
      postLicenseKeys,
    ),
  };
}

export function normalizeLegalLicenseDraft(input) {
  const parsed = legalLicenseDraftSchema.parse(input);
  return {
    ...parsed,
    ...normalizeLegalLicenseAnswers(parsed.licenseType, parsed, parsed),
  };
}

export function evaluateLegalLicenseEligibility(licenseType, eligibilityAnswers = {}, context = {}) {
  const requirements = getApplicableLegalLicenseRequirements(licenseType, context)
    .filter((item) => item.category === "ELIGIBILITY" && item.blocking);
  const normalized = normalizeLegalLicenseAnswers(
    licenseType,
    { eligibilityAnswers },
    context,
  ).eligibilityAnswers;
  const issues = requirements
    .filter((requirement) => !answerSatisfiesRequirement(requirement, normalized[requirement.key]))
    .map(requirementIssue);
  return { eligible: issues.length === 0, issues };
}

export function validateLegalLicenseGuidedSubmission(record, context = record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Legal-license record is required");
  }

  const normalizedInput = legalLicenseDraftSchema.pick({
    licenseType: true,
    eligibilityAnswers: true,
    premisesAnswers: true,
    bylawAnswers: true,
    postLicenseDeclarations: true,
  }).parse(record);
  const normalized = normalizeLegalLicenseAnswers(
    normalizedInput.licenseType,
    normalizedInput,
    context,
  );
  const requirements = getApplicableLegalLicenseRequirements(normalizedInput.licenseType, context);
  const knownPostLicenseKeys = new Set(
    requirements
      .filter((requirement) => requirement.category === "POST_LICENSE")
      .map((requirement) => requirement.key),
  );
  const hasUnknownPostLicenseKey = Object.keys(normalizedInput.postLicenseDeclarations)
    .some((key) => !knownPostLicenseKeys.has(key));
  const issues = hasUnknownPostLicenseKey
    ? [{ key: "post_license.unknown_declaration", scope: "POST_LICENSE" }]
    : [];
  issues.push(...requirements
    .filter((requirement) => requirement.blocking)
    .filter((requirement) => {
      const recordName = requirementAnswerRecord(requirement);
      return !answerSatisfiesRequirement(requirement, normalized[recordName][requirement.key]);
    })
    .map(requirementIssue));

  if (issues.length) throw incompleteRequirements(issues);
  return normalized;
}

export function buildRequirementSnapshot(licenseType, context = {}) {
  const profile = getLegalLicenseRequirementProfile(licenseType);
  if (!profile) throw new Error("Invalid legal-license type");
  return {
    licenseType,
    templateVersion: profile.templateVersion,
    sourceDocuments: [...profile.sourceDocuments],
    requirements: getApplicableLegalLicenseRequirements(licenseType, context).map((requirement) => ({
      key: requirement.key,
      category: requirement.category,
      answerType: requirement.answerType,
      blocking: requirement.blocking,
      label: { ...requirement.label },
      help: { ...requirement.help },
      source: { ...requirement.source },
      ...(requirement.appliesWhen ? { appliesWhen: { ...requirement.appliesWhen } } : {}),
    })),
  };
}

export { requiredLegalLicenseDocumentKinds };


function managerRequiredText(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new Error(field + " is required");
  return value.trim();
}

export function validateLegalLicenseManagerDetailsForSubmission(managerInput, record = {}) {
  const manager = managerDetailsSchema.parse(managerInput);
  if (!manager.enabled) return manager;

  const normalized = {
    ...manager,
    fullName: managerRequiredText(manager.fullName, "managerDetails.fullName"),
  };
  if (manager.nationalId) {
    normalized.nationalId = manager.nationalId.trim();
    if (!isValidLegalLicenseNationalId(normalized.nationalId)) {
      throw new Error("managerDetails.nationalId is invalid");
    }
    const usedNationalIds = new Set([
      record.nationalId,
      ...(Array.isArray(record.founders) ? record.founders.map((founder) => founder?.nationalId) : []),
    ].filter(Boolean));
    if (usedNationalIds.has(normalized.nationalId)) {
      throw new Error("managerDetails.nationalId duplicates an applicant or founder");
    }
  }
  if (manager.phone) {
    normalized.phone = normalizeLegalLicensePhone(manager.phone);
    if (!isValidLegalLicensePhone(normalized.phone)) {
      throw new Error("managerDetails.phone is invalid");
    }
  }
  if (manager.email) {
    normalized.email = manager.email.trim().toLowerCase();
    if (!isValidLegalLicenseEmail(normalized.email)) {
      throw new Error("managerDetails.email is invalid");
    }
  }
  return normalized;
}

export function validateLegalLicenseSubmissionRecord(record) {
  const normalized = validateLegalLicenseApplication(record);
  const managerDetails = validateLegalLicenseManagerDetailsForSubmission(record.managerDetails, normalized);
  validateLegalLicenseGuidedSubmission(record);
  const attachments = Array.isArray(record.attachments) ? record.attachments : [];
  const requiredKinds = requiredLegalLicenseDocumentKinds(record.licenseType);
  const applicationKinds = requiredKinds.filter((kind) => LEGAL_LICENSE_DOCUMENT_RULES[kind]?.owner === "APPLICATION");
  const presentApplicationKinds = new Set(
    attachments.filter((attachment) => !attachment.founderId).map((attachment) => attachment.kind),
  );
  const missing = applicationKinds.filter((kind) => !presentApplicationKinds.has(kind));

  const founderKinds = requiredKinds.filter((kind) => LEGAL_LICENSE_DOCUMENT_RULES[kind]?.owner === "FOUNDER");
  for (const founder of record.founders || []) {
    if (!founder.id) throw new Error("Founder ids are required before submission");
    const presentFounderKinds = new Set(
      attachments.filter((attachment) => attachment.founderId === founder.id).map((attachment) => attachment.kind),
    );
    for (const kind of founderKinds) {
      if (!presentFounderKinds.has(kind)) missing.push(`${kind}:${founder.id}`);
    }
  }

  if (missing.length) throw new Error(`Missing required attachments: ${missing.join(", ")}`);
  return {
    ...normalized,
    ...normalizeLegalLicenseAnswers(record.licenseType, record, record),
    managerDetails,
  };
}

export function legalLicenseApplicationWriteData(draft) {
  const {
    founders: _founders,
    ...application
  } = normalizeLegalLicenseDraft(draft);
  return application;
}

export function legalLicenseFounderWriteData(draft) {
  const parsed = founderDraftSchema.parse(draft);
  return {
    fullName: parsed.fullName || null,
    nationalId: parsed.nationalId || null,
    birthDate: parsed.birthDate ? new Date(parsed.birthDate) : null,
    nationality: parsed.nationality || null,
    occupation: parsed.occupation || null,
    qualification: parsed.qualification || null,
    phone: parsed.phone || null,
    email: parsed.email || null,
    address: parsed.address || null,
    visualSignature: parsed.visualSignature || null,
    isAuthorizedRepresentative: parsed.isAuthorizedRepresentative,
  };
}
