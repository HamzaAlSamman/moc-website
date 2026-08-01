import {
  LEGAL_LICENSE_REQUIREMENT_CATEGORIES,
  getApplicableLegalLicenseRequirements,
} from "./legal-license-requirements.mjs";
import {
  GENERAL_LEGAL_LICENSE_DOCUMENTS,
  LEGAL_LICENSE_DOCUMENT_RULES,
  isValidLegalLicenseEmail,
  isValidLegalLicenseNationalId,
  isValidLegalLicensePhone,
  isValidLegalLicenseVisualSignature,
} from "./legal-license.mjs";

const STEP_DEFINITIONS = [
  { id: "guide", label: { ar: "الدليل ونوع الترخيص", en: "Guide & license type" } },
  { id: "eligibility", label: { ar: "الأهلية", en: "Eligibility" } },
  { id: "people", label: { ar: "مقدم الطلب والمؤسسون", en: "Applicant & founders" } },
  { id: "entity", label: { ar: "الجهة والمقر", en: "Entity & premises" } },
  { id: "documents", label: { ar: "الوثائق", en: "Documents" } },
  { id: "bylaws", label: { ar: "النظام الأساسي", en: "Bylaws" } },
  { id: "review", label: { ar: "المراجعة", en: "Review" } },
  { id: "declaration", label: { ar: "الإقرار والإرسال", en: "Declaration & submit" } },
];

export const LEGAL_LICENSE_WIZARD_STEPS = Object.freeze(
  STEP_DEFINITIONS.map((step, index) => Object.freeze({ ...step, index })),
);

export const LOCAL_WIZARD_SNAPSHOT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const LOCAL_TRACKING_SNAPSHOT_TTL_MS = LOCAL_WIZARD_SNAPSHOT_TTL_MS;
export const LOCAL_WIZARD_MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const LOCAL_WIZARD_SNAPSHOT_VERSION = 3;
const LOCAL_TRACKING_SNAPSHOT_VERSION = 1;

const STEP_BY_SCOPE = Object.freeze({
  ELIGIBILITY: 1,
  APPLICANT: 2,
  FOUNDER: 2,
  PREMISES: 3,
  EQUIPMENT: 3,
  EVIDENCE: 3,
  ATTACHMENT: 4,
  BYLAWS: 5,
  POST_LICENSE: 7,
});

const STEP_BY_FIELD = Object.freeze({
  licenseType: 0,
  applicantName: 2,
  nationalId: 2,
  phone: 2,
  email: 2,
  capacity: 2,
  managerDetails: 2,
  founders: 2,
  entityName: 3,
  purpose: 3,
  objectives: 3,
  activityDescription: 3,
  governorate: 3,
  address: 3,
  eligibilityAnswers: 1,
  premisesAnswers: 3,
  bylawAnswers: 5,
  postLicenseDeclarations: 7,
  declarationAccuracy: 7,
  declarationResponsibility: 7,
  declarationPrivacy: 7,
  applicantSignature: 7,
});

const FORM_TEXT_FIELDS = Object.freeze([
  "licenseType", "applicantName", "nationalId", "phone", "email", "capacity",
  "entityName", "purpose", "objectives", "activityDescription", "governorate", "address",
]);
const FOUNDER_TEXT_FIELDS = Object.freeze([
  "id", "fullName", "nationalId", "birthDate", "occupation", "qualification", "phone", "email", "address",
]);
const MANAGER_TEXT_FIELDS = Object.freeze([
  "fullName", "nationalId", "phone", "email", "occupation", "qualification",
]);
const ANSWER_RECORD_FIELDS = Object.freeze([
  "eligibilityAnswers", "premisesAnswers", "bylawAnswers", "postLicenseDeclarations",
]);
const ANSWER_KEY = /^[a-zA-Z0-9_.:-]{1,256}$/;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === "string" && Boolean(value.trim());
}

function applicableBlocking(profile, form, categories) {
  if (!profile) return [];
  const acceptedCategories = new Set(categories);
  return getApplicableLegalLicenseRequirements(profile.licenseType, form)
    .filter((requirement) => requirement.blocking && acceptedCategories.has(requirement.category));
}

function requirementAnswerSatisfied(requirement, value) {
  if (requirement.answerType === "BOOLEAN") return value === true;
  if (requirement.answerType === "NUMBER") return typeof value === "number" && Number.isFinite(value);
  return typeof value === "string" && value.trim().length > 0;
}

function requirementsSatisfied(requirements, answers) {
  const record = isRecord(answers) ? answers : {};
  return requirements.every((requirement) => requirementAnswerSatisfied(requirement, record[requirement.key]));
}

function blockingEligibility(profile, form) {
  return applicableBlocking(profile, form, [LEGAL_LICENSE_REQUIREMENT_CATEGORIES.ELIGIBILITY]);
}

export function wizardEligibility(profile, form = {}) {
  const requirements = blockingEligibility(profile, form);
  const answers = isRecord(form.eligibilityAnswers) ? form.eligibilityAnswers : {};
  const issues = requirements.filter((requirement) => answers[requirement.key] !== true);
  return { eligible: Boolean(profile) && issues.length === 0, issues };
}

function optionalValueIsValid(value, validator) {
  if (value === null || value === undefined) return true;
  if (typeof value !== "string") return false;
  return !value.trim() || validator(value);
}

function managerCompleted(manager, usedNationalIds) {
  if (!isRecord(manager) || manager.enabled !== true) return !manager || manager.enabled === false;
  if (!nonEmpty(manager.fullName)) return false;
  if (!MANAGER_TEXT_FIELDS.every((field) => manager[field] === undefined || typeof manager[field] === "string")) return false;
  if (!optionalValueIsValid(manager.nationalId, isValidLegalLicenseNationalId)) return false;
  if (manager.nationalId && usedNationalIds.has(manager.nationalId.trim())) return false;
  if (!optionalValueIsValid(manager.phone, isValidLegalLicensePhone)) return false;
  if (!optionalValueIsValid(manager.email, isValidLegalLicenseEmail)) return false;
  return true;
}

function peopleCompleted(form) {
  if (!nonEmpty(form.applicantName) || !nonEmpty(form.capacity)
    || !isValidLegalLicenseNationalId(form.nationalId)
    || !isValidLegalLicensePhone(form.phone)
    || !isValidLegalLicenseEmail(form.email)) return false;

  const founders = Array.isArray(form.founders) ? form.founders : [];
  if (founders.length === 0) return false;
  const usedNationalIds = new Set([form.nationalId.trim()]);
  for (const founder of founders) {
    if (!isRecord(founder) || !nonEmpty(founder.fullName)
      || !isValidLegalLicenseNationalId(founder.nationalId)
      || !optionalValueIsValid(founder.phone, isValidLegalLicensePhone)
      || !optionalValueIsValid(founder.email, isValidLegalLicenseEmail)) return false;
    const nationalId = founder.nationalId.trim();
    if (usedNationalIds.has(nationalId)) return false;
    usedNationalIds.add(nationalId);
  }
  const representativeCount = founders.filter((founder) => founder?.isAuthorizedRepresentative === true).length;
  return representativeCount === 1 && managerCompleted(form.managerDetails, usedNationalIds);
}

function entityCompleted(profile, form) {
  if (!profile) return false;
  const fieldsComplete = profile.requiredFields.every((field) => nonEmpty(form[field]));
  const requirements = applicableBlocking(profile, form, [
    LEGAL_LICENSE_REQUIREMENT_CATEGORIES.PREMISES,
    LEGAL_LICENSE_REQUIREMENT_CATEGORIES.EQUIPMENT,
    LEGAL_LICENSE_REQUIREMENT_CATEGORIES.EVIDENCE,
  ]);
  return fieldsComplete && requirementsSatisfied(requirements, form.premisesAnswers);
}

function requiredDocumentKinds(profile) {
  if (!profile) return [];
  return [...new Set([
    ...GENERAL_LEGAL_LICENSE_DOCUMENTS.map((document) => document.kind),
    ...profile.attachmentKinds,
  ])].filter((kind) => LEGAL_LICENSE_DOCUMENT_RULES[kind]?.required !== false);
}

function documentsCompleted(profile, form, application) {
  if (!profile || !Array.isArray(application?.attachments)) return false;
  const founders = Array.isArray(form.founders) ? form.founders : [];
  const attachments = application.attachments;
  return requiredDocumentKinds(profile).every((kind) => {
    const owner = LEGAL_LICENSE_DOCUMENT_RULES[kind]?.owner;
    if (owner === "FOUNDER") {
      return founders.length > 0 && founders.every((founder) => nonEmpty(founder?.id)
        && attachments.some((attachment) => attachment?.kind === kind && attachment?.founderId === founder.id));
    }
    return attachments.some((attachment) => attachment?.kind === kind && !attachment?.founderId);
  });
}

function bylawsCompleted(profile, form) {
  const requirements = applicableBlocking(profile, form, [LEGAL_LICENSE_REQUIREMENT_CATEGORIES.BYLAWS]);
  return requirementsSatisfied(requirements, form.bylawAnswers);
}

function declarationCompleted(profile, form) {
  const requirements = applicableBlocking(profile, form, [LEGAL_LICENSE_REQUIREMENT_CATEGORIES.POST_LICENSE]);
  return form.declarationAccuracy === true
    && form.declarationResponsibility === true
    && form.declarationPrivacy === true
    && isValidLegalLicenseVisualSignature(form.applicantSignature)
    && requirementsSatisfied(requirements, form.postLicenseDeclarations);
}

function baseStepCompleted(stepId, { profile, form = {}, application } = {}) {
  if (stepId === "guide") return Boolean(profile && form.licenseType === profile.licenseType);
  if (stepId === "eligibility") return wizardEligibility(profile, form).eligible;
  if (stepId === "people") return peopleCompleted(form);
  if (stepId === "entity") return entityCompleted(profile, form);
  if (stepId === "documents") return documentsCompleted(profile, form, application);
  if (stepId === "bylaws") return bylawsCompleted(profile, form);
  if (stepId === "declaration") return declarationCompleted(profile, form);
  return false;
}


export function wizardStepStatus(stepId, context = {}) {
  let status;
  if (stepId === "review") {
    const completed = LEGAL_LICENSE_WIZARD_STEPS.slice(0, 6)
      .every((step) => baseStepCompleted(step.id, context));
    status = { required: true, completed, notRequired: false };
  } else if (stepId === "bylaws") {
    const required = applicableBlocking(context.profile, context.form || {}, [LEGAL_LICENSE_REQUIREMENT_CATEGORIES.BYLAWS]).length > 0;
    status = { required, completed: baseStepCompleted(stepId, context), notRequired: !required };
  } else if (LEGAL_LICENSE_WIZARD_STEPS.some((step) => step.id === stepId)) {
    status = { required: true, completed: baseStepCompleted(stepId, context), notRequired: false };
  } else {
    return { required: false, completed: false, notRequired: true };
  }
  return status;
}

export function firstIncompleteWizardStep(context = {}) {
  for (const step of LEGAL_LICENSE_WIZARD_STEPS) {
    if (!wizardStepStatus(step.id, context).completed) return step.index;
  }
  return null;
}

export function canNavigateToWizardStep(stepIndex, context = {}) {
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= LEGAL_LICENSE_WIZARD_STEPS.length) return false;
  if (stepIndex === 0) return true;
  return LEGAL_LICENSE_WIZARD_STEPS.slice(0, stepIndex)
    .every((step) => wizardStepStatus(step.id, context).completed);
}

const INCOMPLETE_MESSAGES = Object.freeze([
  { ar: "اختر نوع الترخيص أولاً.", en: "Choose a license type first." },
  { ar: "استكمل شروط الأهلية قبل المتابعة.", en: "Complete the eligibility conditions before continuing." },
  { ar: "استكمل بيانات مقدم الطلب والمؤسسين وحدد مفوضاً واحداً.", en: "Complete the applicant and founder details and select one representative." },
  { ar: "استكمل بيانات الجهة ومتطلبات المقر.", en: "Complete the entity and premises requirements." },
  { ar: "ارفع جميع الوثائق المطلوبة للطلب ولكل مؤسس.", en: "Upload every required application and founder document." },
  { ar: "راجع مشروع النظام الأساسي وأكّد الإقرار المطلوب.", en: "Review the draft bylaws and accept the required acknowledgment." },
  { ar: "استكمل الخطوات السابقة قبل مراجعة الطلب.", en: "Complete the previous steps before reviewing the application." },
  { ar: "أكمل الإقرارات والتوقيع قبل إرسال الطلب.", en: "Complete the declarations and signature before submitting." },
]);

export function wizardIncompleteMessage(stepIndex, language = "en") {
  const message = INCOMPLETE_MESSAGES[stepIndex] || INCOMPLETE_MESSAGES[0];
  return message[language === "ar" ? "ar" : "en"];
}

function sanitizeAnswerRecord(value) {
  if (!isRecord(value)) return null;
  const normalized = {};
  for (const [key, answer] of Object.entries(value)) {
    if (!ANSWER_KEY.test(key) || ["__proto__", "prototype", "constructor"].includes(key)
      || !(answer === null || typeof answer === "string" || typeof answer === "boolean"
        || (typeof answer === "number" && Number.isFinite(answer)))) return null;
    normalized[key] = answer;
  }
  return normalized;
}

function sanitizeFounder(value) {
  if (!isRecord(value)) return null;
  const founder = {};
  for (const field of FOUNDER_TEXT_FIELDS) {
    const next = value[field];
    if (next !== undefined && next !== null && typeof next !== "string") return null;
    founder[field] = typeof next === "string" ? next : "";
  }
  if (value.isAuthorizedRepresentative !== undefined && typeof value.isAuthorizedRepresentative !== "boolean") return null;
  founder.isAuthorizedRepresentative = value.isAuthorizedRepresentative === true;
  return founder;
}

function sanitizeManager(value) {
  if (value === undefined || value === null) return { enabled: false };
  if (!isRecord(value) || typeof value.enabled !== "boolean") return null;
  if (!value.enabled) return { enabled: false };
  const manager = { enabled: true };
  for (const field of MANAGER_TEXT_FIELDS) {
    const next = value[field];
    if (next !== undefined && typeof next !== "string") return null;
    manager[field] = typeof next === "string" ? next : "";
  }
  return manager;
}

function sanitizeSnapshotForm(value) {
  if (!isRecord(value)) return null;
  const form = {};
  for (const field of FORM_TEXT_FIELDS) {
    const next = value[field];
    if (next !== undefined && typeof next !== "string") return null;
    form[field] = typeof next === "string" ? next : "";
  }
  if (value.founders !== undefined && !Array.isArray(value.founders)) return null;
  const founders = (value.founders || []).map(sanitizeFounder);
  if (founders.some((founder) => founder === null) || founders.length > 100) return null;
  form.founders = founders;
  const managerDetails = sanitizeManager(value.managerDetails);
  if (!managerDetails) return null;
  form.managerDetails = managerDetails;
  for (const field of ANSWER_RECORD_FIELDS) {
    const answers = sanitizeAnswerRecord(value[field] ?? {});
    if (!answers) return null;
    form[field] = answers;
  }
  for (const field of ["declarationAccuracy", "declarationResponsibility", "declarationPrivacy"]) {
    if (value[field] !== undefined && typeof value[field] !== "boolean") return null;
    form[field] = value[field] === true;
  }
  form.applicantSignature = null;
  return form;
}

function sanitizeSnapshotApplication(value) {
  if (value === null || value === undefined) return null;
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const application = {};
  for (const field of ["id", "referenceNo", "status", "updatedAt"]) {
    if (value[field] !== undefined && value[field] !== null && typeof value[field] !== "string") return null;
    if (typeof value[field] === "string") application[field] = value[field];
  }
  if (value.revision !== undefined && (!Number.isInteger(value.revision) || value.revision < 0)) return null;
  if (Number.isInteger(value.revision)) application.revision = value.revision;
  for (const field of ["attachments", "deficiencyScopes"]) {
    if (value[field] !== undefined && !Array.isArray(value[field])) return null;
    application[field] = Array.isArray(value[field]) ? value[field] : [];
  }
  return application;
}

export function buildLocalWizardSnapshot({ form, application = null, token = "", step = 0, now = Date.now() }) {
  const normalizedForm = sanitizeSnapshotForm(isRecord(form) ? form : {});
  const normalizedApplication = sanitizeSnapshotApplication(application);
  return {
    version: LOCAL_WIZARD_SNAPSHOT_VERSION,
    savedAt: now,
    expiresAt: now + LOCAL_WIZARD_SNAPSHOT_TTL_MS,
    form: normalizedForm || sanitizeSnapshotForm({}),
    application: normalizedApplication,
    token: typeof token === "string" ? token.slice(0, 4096) : "",
    step: Number.isInteger(step) && step >= 0 && step < LEGAL_LICENSE_WIZARD_STEPS.length ? step : 0,
  };
}

function validSnapshotTimes(snapshot, now, ttl) {
  return Number.isFinite(snapshot.savedAt)
    && Number.isFinite(snapshot.expiresAt)
    && snapshot.savedAt >= 0
    && snapshot.savedAt <= now + LOCAL_WIZARD_MAX_CLOCK_SKEW_MS
    && snapshot.expiresAt === snapshot.savedAt + ttl
    && snapshot.expiresAt > now;
}

export function parseLocalWizardSnapshot(raw, now = Date.now()) {
  try {
    const snapshot = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!isRecord(snapshot)
      || snapshot.version !== LOCAL_WIZARD_SNAPSHOT_VERSION
      || !validSnapshotTimes(snapshot, now, LOCAL_WIZARD_SNAPSHOT_TTL_MS)
      || typeof snapshot.token !== "string"
      || snapshot.token.length > 4096
      || !Number.isInteger(snapshot.step)
      || snapshot.step < 0
      || snapshot.step >= LEGAL_LICENSE_WIZARD_STEPS.length) return null;
    const form = sanitizeSnapshotForm(snapshot.form);
    const application = sanitizeSnapshotApplication(snapshot.application);
    if (!form || (snapshot.application !== null && !application)) return null;
    return { ...snapshot, form, application };
  } catch {
    return null;
  }
}

export function buildLocalTrackingSnapshot({ referenceNo, accessToken, now = Date.now() } = {}) {
  return {
    version: LOCAL_TRACKING_SNAPSHOT_VERSION,
    savedAt: now,
    expiresAt: now + LOCAL_TRACKING_SNAPSHOT_TTL_MS,
    referenceNo: typeof referenceNo === "string" && referenceNo.trim().length <= 128 ? referenceNo.trim() : "",
    accessToken: typeof accessToken === "string" && accessToken.trim().length <= 4096 ? accessToken.trim() : "",
  };
}

export function parseLocalTrackingSnapshot(raw, now = Date.now()) {
  try {
    const snapshot = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!isRecord(snapshot)
      || snapshot.version !== LOCAL_TRACKING_SNAPSHOT_VERSION
      || !validSnapshotTimes(snapshot, now, LOCAL_TRACKING_SNAPSHOT_TTL_MS)
      || !nonEmpty(snapshot.referenceNo)
      || snapshot.referenceNo.length > 128
      || !nonEmpty(snapshot.accessToken)
      || snapshot.accessToken.length > 4096) return null;
    return {
      ...snapshot,
      referenceNo: snapshot.referenceNo.trim(),
      accessToken: snapshot.accessToken.trim(),
    };
  } catch {
    return null;
  }
}

export function hydrateLocalWizardSnapshot(snapshot, serverApplication) {
  if (!isRecord(snapshot) || !isRecord(snapshot.application) || !isRecord(serverApplication)
    || !nonEmpty(snapshot.application.id) || !nonEmpty(serverApplication.id)
    || snapshot.application.id !== serverApplication.id
    || !nonEmpty(snapshot.token)) return null;
  if (nonEmpty(snapshot.application.referenceNo)
    && snapshot.application.referenceNo !== serverApplication.referenceNo) return null;

  const localForm = sanitizeSnapshotForm(snapshot.form);
  const serverForm = sanitizeSnapshotForm(serverApplication);
  if (!localForm || !serverForm) return null;
  return {
    application: serverApplication,
    token: snapshot.token.trim(),
    form: {
      ...serverForm,
      ...localForm,
      applicantSignature: isValidLegalLicenseVisualSignature(serverApplication.applicantSignature)
        ? serverApplication.applicantSignature
        : null,
    },
    step: serverApplication.status === "SUSPENDED"
      ? firstDeficientWizardStep(serverApplication.deficiencyScopes)
      : snapshot.step,
  };
}
export function buildTrackedWizardResult(application, accessToken) {
  if (!isRecord(application) || !nonEmpty(application.id) || !nonEmpty(accessToken)) return null;
  return { application, accessToken: accessToken.trim() };
}

export function createWizardMutationLock() {
  let owner = null;
  return Object.freeze({
    acquire(nextOwner) {
      if (!nonEmpty(nextOwner) || owner !== null) return false;
      owner = nextOwner;
      return true;
    },
    release(currentOwner) {
      if (owner !== currentOwner) return false;
      owner = null;
      return true;
    },
    locked() { return owner !== null; },
  });
}
function rootField(field) {
  if (typeof field !== "string" || !field) return null;
  if (field.startsWith("founders.")) return "founders";
  return field.split(".")[0];
}

export function mapDeficiencyToWizardStep(deficiency) {
  if (!isRecord(deficiency)) return null;
  if (Object.hasOwn(STEP_BY_SCOPE, deficiency.scope)) return STEP_BY_SCOPE[deficiency.scope];
  if (deficiency.attachmentKind) return STEP_BY_SCOPE.ATTACHMENT;
  const field = rootField(deficiency.field);
  return field && Object.hasOwn(STEP_BY_FIELD, field) ? STEP_BY_FIELD[field] : null;
}

export function firstDeficientWizardStep(scopes) {
  const mapped = (Array.isArray(scopes) ? scopes : [])
    .map(mapDeficiencyToWizardStep)
    .filter(Number.isInteger);
  return mapped.length ? Math.min(...mapped) : 4;
}
export function firstServerIssueWizardStep(response) {
  if (!isRecord(response)) return null;
  const mapped = [];
  for (const issue of Array.isArray(response.issues) ? response.issues : []) {
    const step = mapDeficiencyToWizardStep(issue);
    if (Number.isInteger(step)) mapped.push(step);
  }
  const fieldErrors = response.fields?.fieldErrors;
  if (isRecord(fieldErrors)) {
    for (const field of Object.keys(fieldErrors)) {
      const step = mapDeficiencyToWizardStep({ field });
      if (Number.isInteger(step)) mapped.push(step);
    }
  }
  return mapped.length ? Math.min(...mapped) : null;
}


const API_ERROR_MESSAGES = Object.freeze({
  save: { ar: "تعذر حفظ المسودة. حاول مرة أخرى.", en: "Unable to save the draft. Try again." },
  upload: { ar: "تعذر رفع الوثيقة. تحقق من الملف وحاول مرة أخرى.", en: "Unable to upload the document. Check the file and try again." },
  delete: { ar: "تعذر حذف الوثيقة. حاول مرة أخرى.", en: "Unable to delete the document. Try again." },
  submit: { ar: "تعذر إرسال الطلب. راجع البيانات وحاول مرة أخرى.", en: "Unable to submit the application. Review the data and try again." },
  track: { ar: "تعذر العثور على الطلب. تحقق من الرقم المرجعي ورمز الوصول.", en: "Unable to find the application. Check the reference number and access code." },
  refresh: { ar: "تعذر تحديث بيانات الطلب. أعد المحاولة.", en: "Unable to refresh the application. Try again." },
  preview: { ar: "تعذرت معاينة الطلب.", en: "Unable to preview the application." },
  download: { ar: "تعذر تنزيل الوثيقة.", en: "Unable to download the document." },
});

export function wizardApiErrorMessage(operation, language = "en", response = {}) {
  const locale = language === "ar" ? "ar" : "en";
  const issueStep = firstServerIssueWizardStep(response);
  if (issueStep !== null) return wizardIncompleteMessage(issueStep, locale);
  if (response?.status === 409 || response?.code === "CONFLICT") {
    return locale === "ar"
      ? "تم تعديل الطلب في جلسة أخرى. حدّث الطلب ثم أعد المحاولة."
      : "The application changed in another session. Refresh it and try again.";
  }
  return (API_ERROR_MESSAGES[operation] || API_ERROR_MESSAGES.refresh)[locale];
}

export class WizardUserError extends Error {
  constructor(message) {
    super(message);
    this.name = "WizardUserError";
  }
}

export function createWizardUserError(operation, language = "en", response = {}) {
  return new WizardUserError(wizardApiErrorMessage(operation, language, response));
}

export function wizardFailureMessage(error, operation, language = "en") {
  return error instanceof WizardUserError
    ? error.message
    : wizardApiErrorMessage(operation, language);
}
export function isWizardStepEditable(stepIndex, { status, deficiencyScopes } = {}) {
  if (status !== "SUSPENDED") return true;
  return (Array.isArray(deficiencyScopes) ? deficiencyScopes : [])
    .some((scope) => mapDeficiencyToWizardStep(scope) === stepIndex);
}


function suspendedContext(context) {
  return context?.status === "SUSPENDED"
    ? (Array.isArray(context.deficiencyScopes) ? context.deficiencyScopes : [])
    : null;
}

export function isWizardFieldEditable(field, context = {}) {
  const scopes = suspendedContext(context);
  if (scopes === null) return true;
  return scopes.some((item) => {
    if (!item || typeof item !== "object") return false;
    if (context.subjectRef) {
      const itemField = typeof item.field === "string"
        ? item.field.replace(/^founders[.]/, "")
        : "";
      return item.scope === "FOUNDER"
        && item.subjectRef === context.subjectRef
        && itemField === field;
    }
    return item.field === field;
  });
}

export function isWizardRequirementEditable(requirementKey, context = {}) {
  const scopes = suspendedContext(context);
  if (scopes === null) return true;
  return scopes.some((item) => item?.requirementKey === requirementKey);
}

export function isWizardAttachmentEditable(kind, subjectRef = null, context = {}) {
  const scopes = suspendedContext(context);
  if (scopes === null) return true;
  return scopes.some((item) => (
    item?.scope === "ATTACHMENT"
    && item.attachmentKind === kind
    && (item.subjectRef ?? null) === (subjectRef ?? null)
  ));
}
