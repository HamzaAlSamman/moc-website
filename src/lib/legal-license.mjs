import { LEGAL_LICENSE_REQUIREMENT_PROFILES } from "./legal-license-requirements.mjs";

const document = (kind, ar, en) => Object.freeze({ kind, label: Object.freeze({ ar, en }) });

export const GENERAL_LEGAL_LICENSE_DOCUMENTS = Object.freeze([
  document("NATIONAL_ID_FRONT", "صورة الهوية - الوجه الأمامي", "National ID - front"),
  document("NATIONAL_ID_BACK", "صورة الهوية - الوجه الخلفي", "National ID - back"),
  document("CRIMINAL_RECORD", "لا حكم عليه", "Criminal record certificate"),
  document("PERSONAL_PHOTO", "صورة شخصية", "Personal photo"),
  document("FOUNDER_NON_EMPLOYMENT_CERTIFICATE", "شهادة غير عامل", "Non-employment certificate"),
  document("AUTHORIZATION", "وثيقة التفويض", "Authorization document"),
]);

export const LEGAL_LICENSE_DOCUMENT_RULES = Object.freeze({
  NATIONAL_ID_FRONT: Object.freeze({ owner: "FOUNDER", required: true, label: Object.freeze({ ar: "الهوية - الوجه الأمامي", en: "National ID - front" }) }),
  NATIONAL_ID_BACK: Object.freeze({ owner: "FOUNDER", required: true, label: Object.freeze({ ar: "الهوية - الوجه الخلفي", en: "National ID - back" }) }),
  CRIMINAL_RECORD: Object.freeze({ owner: "FOUNDER", required: true, label: Object.freeze({ ar: "لا حكم عليه", en: "Criminal record certificate" }) }),
  RESIDENCE_DOCUMENT: Object.freeze({ owner: "FOUNDER", required: true, label: Object.freeze({ ar: "إثبات الإقامة", en: "Proof of residence" }) }),
  PERSONAL_PHOTO: Object.freeze({ owner: "FOUNDER", required: true, label: Object.freeze({ ar: "صورة شخصية", en: "Personal photo" }) }),
  FOUNDER_ACADEMIC_QUALIFICATION: Object.freeze({ owner: "FOUNDER", required: true, label: Object.freeze({ ar: "شهادة المؤهل العلمي", en: "Academic qualification certificate" }) }),
  FOUNDER_NON_EMPLOYMENT_CERTIFICATE: Object.freeze({ owner: "FOUNDER", required: true, label: Object.freeze({ ar: "شهادة غير عامل", en: "Non-employment certificate" }) }),
  AUTHORIZATION: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "وثيقة التفويض", en: "Authorization document" }) }),
  FOUNDERS_MINUTES: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "محضر اجتماع المؤسسين", en: "Founders meeting minutes" }) }),
  ACTIVITY_PLAN: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "خطة النشاط", en: "Activity plan" }) }),
  OWNERSHIP_OR_LEASE: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "سند ملكية أو إيجار", en: "Ownership or lease" }) }),
  FLOOR_PLAN: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "مخطط المقر", en: "Floor plan" }) }),
  SAFETY_APPROVAL: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "موافقة السلامة", en: "Safety approval" }) }),
  ARTICLES_OF_ASSOCIATION: Object.freeze({
    owner: "APPLICATION",
    required: true,
    accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,application/pdf",
    help: Object.freeze({ ar: "مطلوب · ملف Word DOCX أو PDF، حتى 5MB", en: "Required · Word DOCX or PDF, up to 5MB" }),
    label: Object.freeze({ ar: "النظام الأساسي المستكمل ببيانات الطلب (بما يتوافق مع النظام الداخلي الاسترشادي)", en: "Articles completed from the application data (aligned with the model internal regulations)" }),
  }),
  MEMBERS_LIST: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "قائمة الأعضاء", en: "Members list" }) }),
  ARTISTIC_PROGRAM: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "البرنامج الفني", en: "Artistic program" }) }),
  PROFESSIONAL_CERTIFICATE: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "شهادة مهنية", en: "Professional certificate" }) }),
  EQUIPMENT_LIST: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "قائمة التجهيزات", en: "Equipment list" }) }),
  ARTWORK_PORTFOLIO: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "ملف الأعمال الفنية", en: "Artwork portfolio" }) }),
  COLLECTION_INVENTORY: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "جرد المقتنيات", en: "Collection inventory" }) }),
  COLLECTION_PROVENANCE: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "مصادر المقتنيات", en: "Collection provenance" }) }),
  ACADEMIC_QUALIFICATION: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "المؤهل العلمي", en: "Academic qualification" }) }),
  PROGRAM_AND_CURRICULUM: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "البرنامج والمنهاج", en: "Program and curriculum" }) }),
  GALLERY_PROGRAM: Object.freeze({ owner: "APPLICATION", required: true, label: Object.freeze({ ar: "برنامج الصالة", en: "Gallery program" }) }),
});
export const LEGAL_LICENSE_TYPES = Object.freeze(Object.fromEntries(
  Object.values(LEGAL_LICENSE_REQUIREMENT_PROFILES).map((profile) => [
    profile.licenseType,
    Object.freeze({
      value: profile.licenseType,
      slug: profile.slug,
      label: profile.label,
      additionalDocuments: profile.attachmentKinds,
      excludedGeneralDocuments: profile.excludedGeneralAttachmentKinds,
      requiredFields: profile.requiredFields,
      pdfTemplate: profile.pdfTemplate,
    }),
  ]),
));

export function requiredLegalLicenseDocumentKinds(licenseType) {
  const config = LEGAL_LICENSE_TYPES[licenseType];
  if (!config) throw new Error("Invalid legal-license type");
  const excluded = new Set(config.excludedGeneralDocuments || []);
  return [...new Set([
    ...GENERAL_LEGAL_LICENSE_DOCUMENTS
      .map((document) => document.kind)
      .filter((kind) => !excluded.has(kind)),
    ...config.additionalDocuments,
  ])];
}

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

export const LEGAL_LICENSE_STATUS_REPORT_STATUSES = Object.freeze([
  "LEGAL_APPROVAL", "MINISTER_APPROVAL", "APPROVED", "REJECTED", "LICENSE_ISSUED", "COMPLETED",
]);

export function canDownloadLegalLicenseStatusReport(application) {
  if (!application) return false;
  if (LEGAL_LICENSE_STATUS_REPORT_STATUSES.includes(application.status)) return true;
  return application.status === "SUSPENDED"
    && (application.history || []).some((entry) => Boolean(entry.publicNote));
}

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
      visualSignature: requiredText(founder.visualSignature, `founders[${index}].visualSignature`),
      isAuthorizedRepresentative: founder.isAuthorizedRepresentative === true,
    };
  });

  normalized.founders.forEach((founder, index) => {
    if (!isValidLegalLicenseVisualSignature(founder.visualSignature)) {
      throw new Error(`founders[${index}].visualSignature is invalid`);
    }
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
  "licenseType", "entityName", "objectives", "activityDescription",
  "governorate", "address", "status", "revision", "declarationAccuracy",
  "declarationResponsibility", "declarationPrivacy", "applicantSignature",
  "deficiencyNote", "licenseNumber",
  "eligibilityAnswers", "premisesAnswers", "bylawAnswers", "postLicenseDeclarations",
  "licenseDate", "submittedAt", "issuedAt", "completedAt", "createdAt", "updatedAt",
];

const PUBLIC_FOUNDER_FIELDS = [
  "id", "fullName", "nationalId", "birthDate", "nationality", "occupation", "qualification", "phone", "email", "address",
  "visualSignature", "isAuthorizedRepresentative", "createdAt", "updatedAt",
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
