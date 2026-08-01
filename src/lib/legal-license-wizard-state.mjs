import {
  LEGAL_LICENSE_BYLAW_ACKNOWLEDGMENT_KEY,
  getApplicableLegalLicenseRequirements,
} from "./legal-license-requirements.mjs";

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

const STEP_BY_SCOPE = Object.freeze({
  ELIGIBILITY: 1,
  APPLICANT: 2,
  FOUNDER: 2,
  PREMISES: 3,
  EQUIPMENT: 3,
  EVIDENCE: 4,
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

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function blockingEligibility(profile, form) {
  if (!profile) return [];
  return getApplicableLegalLicenseRequirements(profile.licenseType, form)
    .filter((requirement) => requirement.category === "ELIGIBILITY" && requirement.blocking);
}

export function wizardEligibility(profile, form = {}) {
  const requirements = blockingEligibility(profile, form);
  const answers = isRecord(form.eligibilityAnswers) ? form.eligibilityAnswers : {};
  const issues = requirements.filter((requirement) => answers[requirement.key] !== true);
  return { eligible: Boolean(profile) && issues.length === 0, issues };
}

export function canNavigateToWizardStep(stepIndex, { profile, form = {} } = {}) {
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= LEGAL_LICENSE_WIZARD_STEPS.length) {
    return false;
  }
  if (stepIndex === 0) return true;
  if (!profile || !form.licenseType) return false;
  if (stepIndex === 1) return true;
  return wizardEligibility(profile, form).eligible;
}

function peopleCompleted(form) {
  const founders = Array.isArray(form.founders) ? form.founders : [];
  const representativeCount = founders.filter((founder) => founder?.isAuthorizedRepresentative).length;
  return Boolean(
    form.applicantName
    && form.nationalId
    && form.phone
    && form.email
    && form.capacity
    && founders.length
    && representativeCount === 1,
  );
}

function entityCompleted(form) {
  return ["entityName", "purpose", "objectives", "activityDescription", "governorate", "address"]
    .every((field) => Boolean(String(form[field] || "").trim()));
}

export function wizardStepStatus(stepId, { profile, form = {}, application } = {}) {
  if (stepId === "guide") {
    return { required: true, completed: Boolean(profile && form.licenseType), notRequired: false };
  }
  if (stepId === "eligibility") {
    return { required: true, completed: wizardEligibility(profile, form).eligible, notRequired: false };
  }
  if (stepId === "people") {
    return { required: true, completed: peopleCompleted(form), notRequired: false };
  }
  if (stepId === "entity") {
    return { required: true, completed: entityCompleted(form), notRequired: false };
  }
  if (stepId === "documents") {
    return {
      required: true,
      completed: Boolean(application && Array.isArray(application.attachments) && application.attachments.length),
      notRequired: false,
    };
  }
  if (stepId === "bylaws") {
    const required = profile?.generatesBylaws === true;
    return {
      required,
      completed: !required || form.bylawAnswers?.[LEGAL_LICENSE_BYLAW_ACKNOWLEDGMENT_KEY] === true,
      notRequired: !required,
    };
  }
  if (stepId === "review") {
    return { required: true, completed: Boolean(application?.id), notRequired: false };
  }
  if (stepId === "declaration") {
    return {
      required: true,
      completed: Boolean(
        form.declarationAccuracy
        && form.declarationResponsibility
        && form.declarationPrivacy
        && form.applicantSignature,
      ),
      notRequired: false,
    };
  }
  return { required: false, completed: false, notRequired: true };
}

export function buildLocalWizardSnapshot({ form, application = null, token = "", step = 0 }) {
  return {
    version: 2,
    form: isRecord(form) ? form : {},
    application: isRecord(application) ? application : null,
    token: typeof token === "string" ? token : "",
    step: Number.isInteger(step) && step >= 0 && step < LEGAL_LICENSE_WIZARD_STEPS.length ? step : 0,
  };
}

export function parseLocalWizardSnapshot(raw) {
  try {
    const snapshot = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (
      !isRecord(snapshot)
      || snapshot.version !== 2
      || !isRecord(snapshot.form)
      || !(snapshot.application === null || isRecord(snapshot.application))
      || typeof snapshot.token !== "string"
      || snapshot.token.length > 4096
      || !Number.isInteger(snapshot.step)
      || snapshot.step < 0
      || snapshot.step >= LEGAL_LICENSE_WIZARD_STEPS.length
    ) return null;
    return snapshot;
  } catch {
    return null;
  }
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
