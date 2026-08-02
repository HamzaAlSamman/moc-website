import { LEGAL_LICENSE_REQUIREMENT_PROFILES } from "./legal-license-requirements.mjs";

const document = (kind, ar, en) => Object.freeze({ kind, label: Object.freeze({ ar, en }) });

export const GENERAL_LEGAL_LICENSE_DOCUMENTS = Object.freeze([
  document("NATIONAL_ID_FRONT", "صورة الهوية - الوجه الأمامي", "National ID - front"),
  document("NATIONAL_ID_BACK", "صورة الهوية - الوجه الخلفي", "National ID - back"),
  document("CRIMINAL_RECORD", "لا حكم عليه", "Criminal record certificate"),
  document("RESIDENCE_DOCUMENT", "إثبات الإقامة", "Proof of residence"),
  document("PERSONAL_PHOTO", "صورة شخصية", "Personal photo"),
  document("AUTHORIZATION", "وثيقة التفويض", "Authorization document"),
]);

export const LEGAL_LICENSE_DOCUMENT_RULES = Object.freeze({
  NATIONAL_ID_FRONT: Object.freeze({ owner: "FOUNDER", required: true, label: Object.freeze({ ar: "\u0627\u0644\u0647\u0648\u064a\u0629 - \u0627\u0644\u0648\u062c\u0647 \u0627\u0644\u0623\u0645\u0627\u0645\u064a", en: "National ID - front" }) }),
  NATIONAL_ID_BACK: Object.freeze({ owner: "FOUNDER", required: true, label: Object.freeze({ ar: "\u0627\u0644\u0647\u0648\u064a\u0629 - \u0627\u0644\u0648\u062c\u0647 \u0627\u0644\u062e\u0644\u0641\u064a", en: "National ID - back" }) }),
  CRIMINAL_RECORD: Object.freeze({ owner: "FOUNDER", required: true, label: Object.freeze({ ar: "\u0644\u0627 \u062d\u0643\u0645 \u0639\u0644\u064a\u0647", en: "Criminal record certificate" }) }),
  RESIDENCE_DOCUMENT: Object.freeze({ owner: "FOUNDER", required: true, label: Object.freeze({ ar: "\u0625\u062b\u0628\u0627\u062a \u0627\u0644\u0625\u0642\u0627\u0645\u0629", en: "Proof of residence" }) }),
  PERSONAL_PHOTO: Object.freeze({ owner: "FOUNDER", required: true, label: Object.freeze({ ar: "\u0635\u0648\u0631\u0629 \u0634\u062e\u0635\u064a\u0629", en: "Personal photo" }) }),
  AUTHORIZATION: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "\u0648\u062b\u064a\u0642\u0629 \u0627\u0644\u062a\u0641\u0648\u064a\u0636", en: "Authorization document" }) }),
  FOUNDERS_MINUTES: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "\u0645\u062d\u0636\u0631 \u0627\u062c\u062a\u0645\u0627\u0639 \u0627\u0644\u0645\u0624\u0633\u0633\u064a\u0646", en: "Founders meeting minutes" }) }),
  ACTIVITY_PLAN: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "\u062e\u0637\u0629 \u0627\u0644\u0646\u0634\u0627\u0637", en: "Activity plan" }) }),
  OWNERSHIP_OR_LEASE: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "\u0633\u0646\u062f \u0645\u0644\u0643\u064a\u0629 \u0623\u0648 \u0625\u064a\u062c\u0627\u0631", en: "Ownership or lease" }) }),
  FLOOR_PLAN: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "\u0645\u062e\u0637\u0637 \u0627\u0644\u0645\u0642\u0631", en: "Floor plan" }) }),
  SAFETY_APPROVAL: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "\u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0633\u0644\u0627\u0645\u0629", en: "Safety approval" }) }),
  ARTICLES_OF_ASSOCIATION: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "\u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0623\u0633\u0627\u0633\u064a", en: "Articles of association" }) }),
  MEMBERS_LIST: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0623\u0639\u0636\u0627\u0621", en: "Members list" }) }),
  ARTISTIC_PROGRAM: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "\u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c \u0627\u0644\u0641\u0646\u064a", en: "Artistic program" }) }),
  PROFESSIONAL_CERTIFICATE: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "\u0634\u0647\u0627\u062f\u0629 \u0645\u0647\u0646\u064a\u0629", en: "Professional certificate" }) }),
  EQUIPMENT_LIST: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062a\u062c\u0647\u064a\u0632\u0627\u062a", en: "Equipment list" }) }),
  ARTWORK_PORTFOLIO: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "\u0645\u0644\u0641 \u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u0627\u0644\u0641\u0646\u064a\u0629", en: "Artwork portfolio" }) }),
  COLLECTION_INVENTORY: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "\u062c\u0631\u062f \u0627\u0644\u0645\u0642\u062a\u0646\u064a\u0627\u062a", en: "Collection inventory" }) }),
  COLLECTION_PROVENANCE: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "\u0645\u0635\u0627\u062f\u0631 \u0627\u0644\u0645\u0642\u062a\u0646\u064a\u0627\u062a", en: "Collection provenance" }) }),
  ACADEMIC_QUALIFICATION: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "\u0627\u0644\u0645\u0624\u0647\u0644 \u0627\u0644\u0639\u0644\u0645\u064a", en: "Academic qualification" }) }),
  PROGRAM_AND_CURRICULUM: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "\u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c \u0648\u0627\u0644\u0645\u0646\u0647\u0627\u062c", en: "Program and curriculum" }) }),
  GALLERY_PROGRAM: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "\u0628\u0631\u0646\u0627\u0645\u062c \u0627\u0644\u0635\u0627\u0644\u0629", en: "Gallery program" }) }),
});
export const LEGAL_LICENSE_TYPES = Object.freeze(Object.fromEntries(
  Object.values(LEGAL_LICENSE_REQUIREMENT_PROFILES).map((profile) => [
    profile.licenseType,
    Object.freeze({
      value: profile.licenseType,
      slug: profile.slug,
      label: profile.label,
      additionalDocuments: profile.attachmentKinds,
      requiredFields: profile.requiredFields,
      pdfTemplate: profile.pdfTemplate,
    }),
  ]),
));

export const LEGAL_LICENSE_STATUSES = Object.freeze([
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "COMMITTEE_REVIEW",
  "SUSPENDED",
  "LEGAL_APPROVAL",
  "MINISTER_APPROVAL",
  "APPROVED",
  "REJECTED",
  "LICENSE_ISSUED",
  "COMPLETED",
]);

const LEGAL_LICENSE_STATUS_GRAPH = Object.freeze({
  DRAFT: new Set(["SUBMITTED"]),
  SUBMITTED: new Set(["UNDER_REVIEW"]),
  UNDER_REVIEW: new Set(["COMMITTEE_REVIEW", "SUSPENDED"]),
  COMMITTEE_REVIEW: new Set(["LEGAL_APPROVAL", "SUSPENDED"]),
  SUSPENDED: new Set(["UNDER_REVIEW"]),
  LEGAL_APPROVAL: new Set(["MINISTER_APPROVAL", "SUSPENDED"]),
  MINISTER_APPROVAL: new Set(["APPROVED", "REJECTED"]),
  APPROVED: new Set(["LICENSE_ISSUED"]),
  LICENSE_ISSUED: new Set(["COMPLETED"]),
});

const ROLE_TRANSITIONS = Object.freeze({
  CITIZEN: new Set(["DRAFT:SUBMITTED", "SUSPENDED:UNDER_REVIEW"]),
  LICENSING_OFFICER: new Set([
    "SUBMITTED:UNDER_REVIEW",
    "UNDER_REVIEW:COMMITTEE_REVIEW",
    "UNDER_REVIEW:SUSPENDED",
    "APPROVED:LICENSE_ISSUED",
    "LICENSE_ISSUED:COMPLETED",
  ]),
  LICENSING_COMMITTEE: new Set([
    "COMMITTEE_REVIEW:LEGAL_APPROVAL",
    "COMMITTEE_REVIEW:SUSPENDED",
  ]),
  LEGAL_DIRECTOR: new Set([
    "LEGAL_APPROVAL:MINISTER_APPROVAL",
    "LEGAL_APPROVAL:SUSPENDED",
  ]),
  DEPUTY_MINISTER: new Set([
    "MINISTER_APPROVAL:APPROVED",
    "MINISTER_APPROVAL:REJECTED",
  ]),
});

const REQUIRED_TEXT_FIELDS = [
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
];

const DECLARATION_FIELDS = [
  "declarationAccuracy",
  "declarationResponsibility",
  "declarationPrivacy",
];

const NATIONAL_ID_PATTERN = /^\d{11}$/;
const PHONE_PATTERN = /^\+?\d{8,15}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VISUAL_SIGNATURE_PATTERN = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_VISUAL_SIGNATURE_LENGTH = 2_000_000;

export function isValidLegalLicenseNationalId(value) {
  return typeof value === "string" && NATIONAL_ID_PATTERN.test(value.trim());
}

export function normalizeLegalLicensePhone(value) {
  return typeof value === "string" ? value.trim().replace(/[\s()-]/g, "") : "";
}

export function isValidLegalLicensePhone(value) {
  return PHONE_PATTERN.test(normalizeLegalLicensePhone(value));
}

export function isValidLegalLicenseEmail(value) {
  return typeof value === "string" && EMAIL_PATTERN.test(value.trim().toLowerCase());
}

export function isValidLegalLicenseVisualSignature(value) {
  return typeof value === "string"
    && value.length <= MAX_VISUAL_SIGNATURE_LENGTH
    && VISUAL_SIGNATURE_PATTERN.test(value);
}

function requiredText(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required`);
  return value.trim();
}

function validateNationalId(value, field) {
  const normalized = requiredText(value, field);
  if (!isValidLegalLicenseNationalId(normalized)) throw new Error(`${field} is invalid`);
  return normalized;
}

function validatePhone(value, field) {
  const normalized = normalizeLegalLicensePhone(requiredText(value, field));
  if (!isValidLegalLicensePhone(normalized)) throw new Error(`${field} is invalid`);
  return normalized;
}

function validateEmail(value, field) {
  const normalized = requiredText(value, field).toLowerCase();
  if (!isValidLegalLicenseEmail(normalized)) throw new Error(`${field} is invalid`);
  return normalized;
}

export function validateLegalLicenseApplication(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("application is required");
  }

  const normalized = { ...data };
  for (const field of REQUIRED_TEXT_FIELDS) normalized[field] = requiredText(data[field], field);
  normalized.nationalId = validateNationalId(data.nationalId, "nationalId");
  normalized.phone = validatePhone(data.phone, "phone");
  normalized.email = validateEmail(data.email, "email");

  if (!Object.hasOwn(LEGAL_LICENSE_TYPES, data.licenseType)) {
    throw new Error("licenseType is invalid");
  }

  if (!Array.isArray(data.founders) || data.founders.length === 0) {
    throw new Error("founders must contain at least one founder");
  }

  const nationalIds = new Set([normalized.nationalId]);
  normalized.founders = data.founders.map((founder, index) => {
    if (!founder || typeof founder !== "object" || Array.isArray(founder)) {
      throw new Error(`founders[${index}] is invalid`);
    }
    const nationalId = validateNationalId(founder.nationalId, `founders[${index}].nationalId`);
    if (nationalIds.has(nationalId)) throw new Error("duplicate nationalId");
    nationalIds.add(nationalId);
    return {
      ...founder,
      fullName: requiredText(founder.fullName, `founders[${index}].fullName`),
      nationalId,
      phone: founder.phone ? validatePhone(founder.phone, `founders[${index}].phone`) : null,
      email: founder.email ? validateEmail(founder.email, `founders[${index}].email`) : null,
      isAuthorizedRepresentative: founder.isAuthorizedRepresentative === true,
    };
  });

  const representativeCount = normalized.founders.filter((founder) => founder.isAuthorizedRepresentative).length;
  if (representativeCount !== 1) throw new Error("exactly one founder must be the authorized representative");

  for (const field of DECLARATION_FIELDS) {
    if (data[field] !== true) throw new Error(`${field} must be accepted`);
  }
  normalized.applicantSignature = requiredText(data.applicantSignature, "applicantSignature");
  if (!isValidLegalLicenseVisualSignature(normalized.applicantSignature)) {
    throw new Error("applicantSignature is invalid");
  }

  return normalized;
}

export function canTransitionLegalLicense(role, currentStatus, nextStatus) {
  if (!LEGAL_LICENSE_STATUSES.includes(currentStatus) || !LEGAL_LICENSE_STATUSES.includes(nextStatus)) {
    return false;
  }
  if (currentStatus === nextStatus) return false;
  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    return LEGAL_LICENSE_STATUS_GRAPH[currentStatus]?.has(nextStatus) ?? false;
  }
  return ROLE_TRANSITIONS[role]?.has(`${currentStatus}:${nextStatus}`) ?? false;
}

const PUBLIC_APPLICATION_FIELDS = [
  "id", "referenceNo", "applicantName", "nationalId", "phone", "email", "capacity",
  "licenseType", "entityName", "purpose", "objectives", "activityDescription",
  "governorate", "address", "status", "revision", "declarationAccuracy",
  "declarationResponsibility", "declarationPrivacy", "applicantSignature",
  "deficiencyNote", "licenseNumber",
  "eligibilityAnswers", "premisesAnswers", "bylawAnswers", "postLicenseDeclarations",
  "licenseDate", "submittedAt", "issuedAt", "completedAt", "createdAt", "updatedAt",
];

const PUBLIC_FOUNDER_FIELDS = [
  "id", "fullName", "nationalId", "birthDate", "occupation", "qualification", "phone", "email", "address",
  "isAuthorizedRepresentative", "createdAt", "updatedAt",
];

const PUBLIC_ATTACHMENT_FIELDS = [
  "id", "founderId", "kind", "originalName", "mimeType", "size", "version", "createdAt",
];

const PUBLIC_HISTORY_FIELDS = [
  "id", "fromStatus", "toStatus", "action", "publicNote", "createdAt",
];

const PUBLIC_MANAGER_DETAIL_FIELDS = [
  "fullName", "nationalId", "phone", "email", "occupation", "qualification",
];

function publicManagerDetails(manager) {
  if (!manager || typeof manager !== "object" || Array.isArray(manager) || manager.enabled !== true) {
    return { enabled: false };
  }
  return {
    enabled: true,
    ...Object.fromEntries(PUBLIC_MANAGER_DETAIL_FIELDS.map((field) => [
      field,
      typeof manager[field] === "string" ? manager[field] : "",
    ])),
  };
}

const PUBLIC_DEFICIENCY_SCOPE_FIELDS = [
  "scope", "field", "requirementKey", "attachmentKind", "subjectRef",
];

function publicDeficiencyScopes(scopes) {
  return Array.isArray(scopes)
    ? scopes
        .filter((item) => item && typeof item === "object" && !Array.isArray(item))
        .map((item) => pick(item, PUBLIC_DEFICIENCY_SCOPE_FIELDS))
    : [];
}

function pick(source, fields) {
  return Object.fromEntries(
    fields
      .filter((field) => source?.[field] !== undefined)
      .map((field) => [field, source[field]]),
  );
}

export function toPublicLegalLicenseApplication(application) {
  const dto = pick(application, PUBLIC_APPLICATION_FIELDS);
  dto.founders = Array.isArray(application?.founders)
    ? application.founders.map((founder) => pick(founder, PUBLIC_FOUNDER_FIELDS))
    : [];
  dto.attachments = Array.isArray(application?.attachments)
    ? application.attachments.map((attachment) => pick(attachment, PUBLIC_ATTACHMENT_FIELDS))
    : [];
  dto.managerDetails = publicManagerDetails(application?.managerDetails);
  dto.deficiencyScopes = publicDeficiencyScopes(application?.deficiencyScopes);
  dto.history = Array.isArray(application?.history)
    ? application.history.map((entry) => pick(entry, PUBLIC_HISTORY_FIELDS))
    : [];
  return dto;
}
