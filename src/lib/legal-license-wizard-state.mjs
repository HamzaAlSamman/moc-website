import {
  LEGAL_LICENSE_REQUIREMENT_CATEGORIES,
  getApplicableLegalLicenseRequirements,
} from "./legal-license-requirements.mjs";
import {
  LEGAL_LICENSE_DOCUMENT_RULES,
  isValidLegalLicenseEmail,
  isValidLegalLicenseNationalId,
  isValidLegalLicensePhone,
  isValidLegalLicenseVisualSignature,
  requiredLegalLicenseDocumentKinds,
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
const BYLAWS_FIRST_STEP_ORDER = Object.freeze([0, 1, 2, 3, 5, 4, 6, 7]);

export function orderedLegalLicenseWizardSteps(profile) {
  if (!profile?.generatesBylaws) return LEGAL_LICENSE_WIZARD_STEPS;
  return BYLAWS_FIRST_STEP_ORDER.map((index) => LEGAL_LICENSE_WIZARD_STEPS[index]);
}

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
  "entityName", "objectives", "activityDescription", "governorate", "address",
]);
const FOUNDER_TEXT_FIELDS = Object.freeze([
  "id", "fullName", "nationalId", "birthDate", "nationality", "occupation", "qualification", "phone", "email", "address",
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
  return requiredLegalLicenseDocumentKinds(profile.licenseType)
    .filter((kind) => LEGAL_LICENSE_DOCUMENT_RULES[kind]?.required !== false);
}

function documentsCompleted(profile, form, application) {
  if (!profile || !Array.isArray(application?.attachments)) return false;
  const founders = Array.isArray(form.founders) ? form.founders : [];
  const attachments = application.attachments;
  return requiredDocumentKinds(profile)
    .filter((kind) => !(profile.generatesBylaws && kind === "ARTICLES_OF_ASSOCIATION"))
    .every((kind) => {
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
  const foundersSigned = Array.isArray(form.founders)
    && form.founders.every((founder) => isValidLegalLicenseVisualSignature(founder?.visualSignature));
  return form.declarationAccuracy === true
    && form.declarationResponsibility === true
    && form.declarationPrivacy === true
    && isValidLegalLicenseVisualSignature(form.applicantSignature)
    && foundersSigned
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
  } else if (stepId === "eligibility") {
    const required = blockingEligibility(context.profile, context.form || {}).length > 0;
    status = { required, completed: baseStepCompleted(stepId, context), notRequired: !required };
  } else if (LEGAL_LICENSE_WIZARD_STEPS.some((step) => step.id === stepId)) {
    status = { required: true, completed: baseStepCompleted(stepId, context), notRequired: false };
  } else {
    return { required: false, completed: false, notRequired: true };
  }
  return status;
}

export function firstIncompleteWizardStep(context = {}) {
  for (const step of orderedLegalLicenseWizardSteps(context.profile)) {
    if (!wizardStepStatus(step.id, context).completed) return step.index;
  }
  return null;
}

export function canNavigateToWizardStep(stepIndex, context = {}) {
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= LEGAL_LICENSE_WIZARD_STEPS.length) return false;
  if (stepIndex === 0) return true;
  const orderedSteps = orderedLegalLicenseWizardSteps(context.profile);
  const targetPosition = orderedSteps.findIndex((step) => step.index === stepIndex);
  if (targetPosition < 0) return false;
  return orderedSteps.slice(0, targetPosition)
    .every((step) => wizardStepStatus(step.id, context).completed);
}

const INCOMPLETE_MESSAGES = Object.freeze([
  { ar: "اختر نوع الترخيص أولاً.", en: "Choose a license type first." },
  { ar: "استكمل شروط الأهلية قبل المتابعة.", en: "Complete the eligibility conditions before continuing." },
  { ar: "استكمل بيانات مقدم الطلب والمؤسسين وحدد مفوضاً واحداً.", en: "Complete the applicant and founder details and select one representative." },
  { ar: "استكمل بيانات الجهة ومتطلبات المقر.", en: "Complete the entity and premises requirements." },
  { ar: "ارفع جميع الوثائق المطلوبة للطلب ولكل مؤسس.", en: "Upload every required application and founder document." },
  { ar: "نزّل النظام الأساسي المستكمل ببيانات الطلب، راجعه وأكّد الإقرار المطلوب.", en: "Download and review the articles completed from the application data, then accept the acknowledgment." },
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
  founder.visualSignature = null;
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
  const serverFounders = new Map(
    (serverApplication.founders || []).map((founder) => [founder.id || founder.nationalId, founder]),
  );
  return {
    application: serverApplication,
    token: snapshot.token.trim(),
    form: {
      ...serverForm,
      ...localForm,
      founders: localForm.founders.map((founder) => {
        const serverFounder = serverFounders.get(founder.id || founder.nationalId);
        return {
          ...founder,
          visualSignature: isValidLegalLicenseVisualSignature(serverFounder?.visualSignature)
            ? serverFounder.visualSignature
            : null,
        };
      }),
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

export function createWizardHydrationGuard() {
  let generation = 0;
  let controller = null;
  return Object.freeze({
    begin() {
      controller?.abort();
      controller = new AbortController();
      generation += 1;
      return Object.freeze({ id: generation, signal: controller.signal });
    },
    isCurrent(id) {
      return Number.isInteger(id) && id === generation && controller !== null && !controller.signal.aborted;
    },
    finish(id) {
      if (!Number.isInteger(id) || id !== generation || controller === null || controller.signal.aborted) return false;
      controller = null;
      return true;
    },
    cancel() {
      generation += 1;
      controller?.abort();
      controller = null;
    },
  });
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
  if (deficiency.attachmentKind === "ARTICLES_OF_ASSOCIATION") return 5;
  if (
    deficiency.scope === "FOUNDER"
    && typeof deficiency.field === "string"
    && deficiency.field.replace(/^founders[.]/, "") === "visualSignature"
  ) return 7;
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
  constructor(message, { status = null } = {}) {
    super(message);
    this.name = "WizardUserError";
    this.status = Number.isInteger(status) ? status : null;
  }
}

export function createWizardUserError(operation, language = "en", response = {}) {
  return new WizardUserError(wizardApiErrorMessage(operation, language, response), {
    status: Number(response?.status),
  });
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

export function getWizardStepValidationError(stepId, { profile, form = {}, application } = {}, language = "en") {
  const isAr = language === "ar";

  if (stepId === "guide") {
    if (!profile || form.licenseType !== profile.licenseType) {
      return isAr ? "يرجى اختيار نوع الترخيص أولاً للمتابعة." : "Please select a license type first to continue.";
    }
  }

  if (stepId === "eligibility") {
    const el = wizardEligibility(profile, form);
    if (!el.eligible) {
      return isAr
        ? "يرجى استكمال جميع شروط الأهلية والموافقة عليها للمتابعة."
        : "Please complete and accept all eligibility requirements to continue.";
    }
  }

  if (stepId === "people") {
    if (!nonEmpty(form.applicantName)) {
      return isAr ? "بيانات مقدم الطلب: الاسم الكامل مطلوب." : "Applicant Details: Full name is required.";
    }
    if (!nonEmpty(form.capacity)) {
      return isAr ? "بيانات مقدم الطلب: الصفة القانونية مطلوبة." : "Applicant Details: Legal capacity is required.";
    }
    if (!nonEmpty(form.nationalId)) {
      return isAr ? "بيانات مقدم الطلب: الرقم الوطني مطلوب." : "Applicant Details: National ID is required.";
    }
    if (!isValidLegalLicenseNationalId(form.nationalId)) {
      return isAr ? "بيانات مقدم الطلب: الرقم الوطني يجب أن يتكون من 11 رقماً." : "Applicant Details: National ID must be exactly 11 digits.";
    }
    if (!nonEmpty(form.phone)) {
      return isAr ? "بيانات مقدم الطلب: رقم الهاتف مطلوب." : "Applicant Details: Phone number is required.";
    }
    if (!isValidLegalLicensePhone(form.phone)) {
      return isAr ? "بيانات مقدم الطلب: رقم الهاتف غير صالح (يجب أن يتكون من 8 إلى 15 رقماً)." : "Applicant Details: Phone number is invalid (8 to 15 digits).";
    }
    if (!nonEmpty(form.email)) {
      return isAr ? "بيانات مقدم الطلب: البريد الإلكتروني مطلوب." : "Applicant Details: Email is required.";
    }
    if (!isValidLegalLicenseEmail(form.email)) {
      return isAr ? "بيانات مقدم الطلب: البريد الإلكتروني غير صالح." : "Applicant Details: Email address is invalid.";
    }

    const founders = Array.isArray(form.founders) ? form.founders : [];
    if (founders.length === 0) {
      return isAr ? "بيانات المؤسسين: يجب إضافة مؤسس واحد على الأقل." : "Founders: At least one founder must be added.";
    }

    const usedNationalIds = new Set([form.nationalId.trim()]);
    for (let i = 0; i < founders.length; i++) {
      const founder = founders[i];
      const indexDisplay = i + 1;
      if (!isRecord(founder) || !nonEmpty(founder.fullName)) {
        return isAr ? `بيانات المؤسس ${indexDisplay}: الاسم الكامل مطلوب.` : `Founder ${indexDisplay}: Full name is required.`;
      }
      if (!nonEmpty(founder.nationalId)) {
        return isAr ? `بيانات المؤسس ${indexDisplay}: الرقم الوطني مطلوب.` : `Founder ${indexDisplay}: National ID is required.`;
      }
      if (!isValidLegalLicenseNationalId(founder.nationalId)) {
        return isAr ? `بيانات المؤسس ${indexDisplay}: الرقم الوطني يجب أن يتكون من 11 رقماً.` : `Founder ${indexDisplay}: National ID must be exactly 11 digits.`;
      }

      const nationalId = founder.nationalId.trim();
      if (usedNationalIds.has(nationalId)) {
        return isAr
          ? `بيانات المؤسس ${indexDisplay}: الرقم الوطني مكرر (مستخدم لمقدم الطلب أو لمؤسس آخر).`
          : `Founder ${indexDisplay}: National ID is duplicated.`;
      }
      usedNationalIds.add(nationalId);

      if (founder.phone && !optionalValueIsValid(founder.phone, isValidLegalLicensePhone)) {
        return isAr ? `بيانات المؤسس ${indexDisplay}: رقم الهاتف غير صالح.` : `Founder ${indexDisplay}: Phone number is invalid.`;
      }
      if (founder.email && !optionalValueIsValid(founder.email, isValidLegalLicenseEmail)) {
        return isAr ? `بيانات المؤسس ${indexDisplay}: البريد الإلكتروني غير صالح.` : `Founder ${indexDisplay}: Email address is invalid.`;
      }
    }

    const representativeCount = founders.filter((founder) => founder?.isAuthorizedRepresentative === true).length;
    if (representativeCount === 0) {
      return isAr
        ? "بيانات المؤسسين: يرجى تحديد مؤسس واحد كـ 'مفوض وحيد بالتوقيع'."
        : "Founders: Please select exactly one founder as the sole authorized signatory.";
    }
    if (representativeCount > 1) {
      return isAr
        ? "بيانات المؤسسين: يمكن تحديد مفوض واحد فقط بالتوقيع."
        : "Founders: Only one founder can be the authorized signatory.";
    }

    const manager = form.managerDetails;
    if (isRecord(manager) && manager.enabled === true) {
      if (!nonEmpty(manager.fullName)) {
        return isAr ? "المدير المسؤول: الاسم الكامل مطلوب." : "Manager: Full name is required.";
      }
      if (manager.nationalId && !isValidLegalLicenseNationalId(manager.nationalId)) {
        return isAr ? "المدير المسؤول: الرقم الوطني يجب أن يتكون من 11 رقماً." : "Manager: National ID must be exactly 11 digits.";
      }
      if (manager.nationalId && usedNationalIds.has(manager.nationalId.trim())) {
        return isAr ? "المدير المسؤول: الرقم الوطني مكرر ومستخدم لشخص آخر." : "Manager: National ID is duplicated.";
      }
      if (manager.phone && !isValidLegalLicensePhone(manager.phone)) {
        return isAr ? "المدير المسؤول: رقم الهاتف غير صالح." : "Manager: Phone number is invalid.";
      }
      if (manager.email && !isValidLegalLicenseEmail(manager.email)) {
        return isAr ? "المدير المسؤول: البريد الإلكتروني غير صالح." : "Manager: Email is invalid.";
      }
    }
  }

  if (stepId === "entity") {
    if (!profile) return isAr ? "يرجى استكمال اختيار نوع الترخيص." : "License profile not loaded.";

    for (const field of profile.requiredFields) {
      if (!nonEmpty(form[field])) {
        const fieldLabels = isAr ? {
          entityName: "اسم الجهة مطلوب.",
          objectives: "أهداف الجهة مطلوبة.",
          activityDescription: "وصف النشاط مطلوب.",
          governorate: "المحافظة مطلوبة.",
          address: "عنوان المقر مطلوب."
        } : {
          entityName: "Entity name is required.",
          objectives: "Objectives are required.",
          activityDescription: "Activity description is required.",
          governorate: "Governorate is required.",
          address: "Address is required."
        };
        return fieldLabels[field] || (isAr ? `الحقل ${field} مطلوب.` : `Field ${field} is required.`);
      }
    }

    const requirements = applicableBlocking(profile, form, [
      LEGAL_LICENSE_REQUIREMENT_CATEGORIES.PREMISES,
      LEGAL_LICENSE_REQUIREMENT_CATEGORIES.EQUIPMENT,
      LEGAL_LICENSE_REQUIREMENT_CATEGORIES.EVIDENCE,
    ]);
    if (!requirementsSatisfied(requirements, form.premisesAnswers)) {
      return isAr
        ? "متطلبات المقر والتجهيزات: يرجى الإجابة على جميع الحقول والشروط المطلوبة."
        : "Premises & Equipment: Please answer all required conditions.";
    }
  }

  if (stepId === "documents") {
    if (!baseStepCompleted("documents", { profile, form, application })) {
      return isAr
        ? "الوثائق والمستندات: يرجى رفع جميع الأوراق الثبوتية والوثائق المطلوبة للطلب ولأعضاء الهيئة التأسيسية."
        : "Documents: Please upload all required files for the application and founders.";
    }
  }

  if (stepId === "bylaws") {
    if (!baseStepCompleted("bylaws", { profile, form, application })) {
      return isAr
        ? "النظام الأساسي: يرجى تنزيل النظام الأساسي المستكمل ببيانات الطلب ومراجعته والموافقة على الإقرار."
        : "Bylaws: Download and review the articles completed from the application data, then check the acknowledgment.";
    }
  }

  if (stepId === "declaration") {
    const requirements = applicableBlocking(profile, form, [LEGAL_LICENSE_REQUIREMENT_CATEGORIES.POST_LICENSE]);
    if (form.declarationAccuracy !== true || form.declarationResponsibility !== true || form.declarationPrivacy !== true) {
      return isAr ? "الإقرار والتعهد: يرجى الموافقة على جميع بنود التعهد والإقرار." : "Declarations: Please check all required agreement items.";
    }
    if (!isValidLegalLicenseVisualSignature(form.applicantSignature)) {
      return isAr ? "الإقرار والتعهد: يرجى رسم توقيعكم الخطي في المربع المخصص لإتمام الطلب." : "Declarations: Visual signature is required.";
    }
    const unsignedFounder = (form.founders || []).find(
      (founder) => !isValidLegalLicenseVisualSignature(founder?.visualSignature),
    );
    if (unsignedFounder) {
      return isAr
        ? `الإقرار والتعهد: يرجى إرفاق التوقيع المرئي للمؤسس ${unsignedFounder.fullName || "المحدد"}.`
        : `Declarations: A visual signature is required for founder ${unsignedFounder.fullName || "listed"}.`;
    }
    if (!requirementsSatisfied(requirements, form.postLicenseDeclarations)) {
      return isAr ? "الإقرار والتعهد: يرجى استكمال شروط ما بعد الترخيص." : "Declarations: Please satisfy post-license requirements.";
    }
  }

  return null;
}
