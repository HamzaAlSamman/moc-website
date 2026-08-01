import assert from "node:assert/strict";
import test from "node:test";

import {
  LEGAL_LICENSE_WIZARD_STEPS,
  buildLocalWizardSnapshot,
  buildTrackedWizardResult,
  canNavigateToWizardStep,
  createWizardMutationLock,
  firstIncompleteWizardStep,
  firstServerIssueWizardStep,
  firstDeficientWizardStep,
  isWizardAttachmentEditable,
  isWizardFieldEditable,
  isWizardRequirementEditable,
  isWizardStepEditable,
  mapDeficiencyToWizardStep,
  parseLocalWizardSnapshot,
  LOCAL_WIZARD_SNAPSHOT_TTL_MS,
  wizardIncompleteMessage,
  wizardStepStatus,
} from "./legal-license-wizard-state.mjs";
import { getApplicableLegalLicenseRequirements, getLegalLicenseRequirementProfile } from "./legal-license-requirements.mjs";
import { GENERAL_LEGAL_LICENSE_DOCUMENTS, LEGAL_LICENSE_DOCUMENT_RULES } from "./legal-license.mjs";

test("wizard exposes exactly eight ordered stable steps", () => {
  assert.deepEqual(
    LEGAL_LICENSE_WIZARD_STEPS.map((step) => step.id),
    ["guide", "eligibility", "people", "entity", "documents", "bylaws", "review", "declaration"],
  );
  assert.equal(Object.isFrozen(LEGAL_LICENSE_WIZARD_STEPS), true);
});

test("navigation opens eligibility after type selection and blocks later steps until eligible", () => {
  const profile = getLegalLicenseRequirementProfile("FINE_ARTS_GALLERY");
  const base = { profile, form: { licenseType: profile.licenseType, eligibilityAnswers: {} } };

  assert.equal(canNavigateToWizardStep(1, base), true);
  assert.equal(canNavigateToWizardStep(2, base), false);
  assert.equal(canNavigateToWizardStep(2, {
    ...base,
    form: {
      ...base.form,
      eligibilityAnswers: { "gallery.applicant.union_member_or_manager_contract": false },
    },
  }), false);
  assert.equal(canNavigateToWizardStep(2, {
    ...base,
    form: {
      ...base.form,
      eligibilityAnswers: { "gallery.applicant.union_member_or_manager_contract": true },
    },
  }), true);
});

test("bylaws always has a rail status and is only required by its central profile flag", () => {
  const cultural = getLegalLicenseRequirementProfile("CULTURAL_FORUM");
  const gallery = getLegalLicenseRequirementProfile("FINE_ARTS_GALLERY");

  assert.deepEqual(wizardStepStatus("bylaws", { profile: cultural, form: { bylawAnswers: {} } }), {
    required: true,
    completed: false,
    notRequired: false,
  });
  assert.deepEqual(wizardStepStatus("bylaws", { profile: gallery, form: { bylawAnswers: {} } }), {
    required: false,
    completed: true,
    notRequired: true,
  });
});

test("local draft snapshot resumes form, step, application and secret token safely", () => {
  const snapshot = buildLocalWizardSnapshot({
    form: { licenseType: "FINE_ARTS" },
    application: { id: "app-1", status: "DRAFT" },
    token: "secret-token",
    step: 3,
  });
  assert.deepEqual(parseLocalWizardSnapshot(JSON.stringify(snapshot)), snapshot);
  assert.equal(parseLocalWizardSnapshot("not-json"), null);
  assert.equal(parseLocalWizardSnapshot(JSON.stringify({ ...snapshot, version: 99 })), null);
  assert.equal(parseLocalWizardSnapshot(JSON.stringify({ ...snapshot, token: { unsafe: true } })), null);
});

test("deficiency categories, fields and attachments map to the owning wizard step", () => {
  assert.equal(mapDeficiencyToWizardStep({ scope: "ELIGIBILITY", requirementKey: "x" }), 1);
  assert.equal(mapDeficiencyToWizardStep({ scope: "FOUNDER", field: "founders.phone" }), 2);
  assert.equal(mapDeficiencyToWizardStep({ field: "managerDetails.phone" }), 2);
  assert.equal(mapDeficiencyToWizardStep({ field: "entityName" }), 3);
  assert.equal(mapDeficiencyToWizardStep({ scope: "ATTACHMENT", attachmentKind: "FLOOR_PLAN" }), 4);
  assert.equal(mapDeficiencyToWizardStep({ scope: "BYLAWS", requirementKey: "x" }), 5);
  assert.equal(mapDeficiencyToWizardStep({ scope: "POST_LICENSE", requirementKey: "x" }), 7);
  assert.equal(mapDeficiencyToWizardStep({ field: "applicantSignature" }), 7);
});

test("suspended applications start at the first deficient step and lock other editing scopes", () => {
  const scopes = [
    { scope: "ATTACHMENT", attachmentKind: "FLOOR_PLAN" },
    { scope: "FOUNDER", subjectRef: "founder-1", field: "phone" },
  ];
  assert.equal(firstDeficientWizardStep(scopes), 2);
  assert.equal(isWizardStepEditable(2, { status: "SUSPENDED", deficiencyScopes: scopes }), true);
  assert.equal(isWizardStepEditable(4, { status: "SUSPENDED", deficiencyScopes: scopes }), true);
  assert.equal(isWizardStepEditable(3, { status: "SUSPENDED", deficiencyScopes: scopes }), false);
  assert.equal(isWizardStepEditable(3, { status: "DRAFT", deficiencyScopes: [] }), true);
});


test("suspended field, answer and attachment editing is limited to the exact deficiency", () => {
  const context = {
    status: "SUSPENDED",
    deficiencyScopes: [
      { scope: "FOUNDER", subjectRef: "founder-1", field: "phone" },
      { scope: "PREMISES", requirementKey: "music.building.soundproof_rooms" },
      { scope: "ATTACHMENT", attachmentKind: "FLOOR_PLAN", subjectRef: null },
    ],
  };
  assert.equal(isWizardFieldEditable("phone", { ...context, subjectRef: "founder-1" }), true);
  assert.equal(isWizardFieldEditable("email", { ...context, subjectRef: "founder-1" }), false);
  assert.equal(isWizardFieldEditable("phone", { ...context, subjectRef: "founder-2" }), false);
  assert.equal(isWizardRequirementEditable("music.building.soundproof_rooms", context), true);
  assert.equal(isWizardRequirementEditable("music.other", context), false);
  assert.equal(isWizardAttachmentEditable("FLOOR_PLAN", null, context), true);
  assert.equal(isWizardAttachmentEditable("SAFETY_APPROVAL", null, context), false);
});
function completeWizardContext(licenseType = "CULTURAL_FORUM") {
  const profile = getLegalLicenseRequirementProfile(licenseType);
  const requirements = getApplicableLegalLicenseRequirements(licenseType, {});
  const form = {
    licenseType,
    applicantName: "Applicant",
    nationalId: "01234567890",
    phone: "0999999999",
    email: "citizen@example.com",
    capacity: "Founder",
    founders: [{ id: "founder-1", fullName: "Founder", nationalId: "12345678901", isAuthorizedRepresentative: true }],
    managerDetails: { enabled: false },
    entityName: "Entity",
    purpose: "Purpose",
    objectives: "Objectives",
    activityDescription: "Activity",
    governorate: "Damascus",
    address: "Address",
    eligibilityAnswers: {},
    premisesAnswers: {},
    bylawAnswers: {},
    postLicenseDeclarations: {},
    declarationAccuracy: true,
    declarationResponsibility: true,
    declarationPrivacy: true,
    applicantSignature: "data:image/png;base64,abc",
  };
  for (const requirement of requirements.filter((item) => item.blocking)) {
    if (requirement.category === "ELIGIBILITY") form.eligibilityAnswers[requirement.key] = true;
    else if (["PREMISES", "EQUIPMENT", "EVIDENCE"].includes(requirement.category)) form.premisesAnswers[requirement.key] = true;
    else if (requirement.category === "BYLAWS") form.bylawAnswers[requirement.key] = true;
    else if (requirement.category === "POST_LICENSE") form.postLicenseDeclarations[requirement.key] = true;
  }
  const requiredKinds = [...new Set([
    ...GENERAL_LEGAL_LICENSE_DOCUMENTS.map((document) => document.kind),
    ...profile.attachmentKinds,
  ])];
  const attachments = requiredKinds.flatMap((kind) => {
    const owner = LEGAL_LICENSE_DOCUMENT_RULES[kind]?.owner;
    if (owner === "FOUNDER") return form.founders.map((founder) => ({ kind, founderId: founder.id }));
    return [{ kind, founderId: null }];
  });
  return { profile, form, application: { id: "app-1", attachments } };
}

test("wizard completeness uses central requirements for every ordered step", () => {
  const context = completeWizardContext("MUSIC_INSTITUTE");
  for (const step of LEGAL_LICENSE_WIZARD_STEPS) {
    assert.equal(wizardStepStatus(step.id, context).completed, true, step.id);
  }
  assert.equal(firstIncompleteWizardStep(context), null);
  assert.equal(canNavigateToWizardStep(7, context), true);

  const peopleMissingFounder = structuredClone(context);
  peopleMissingFounder.form.founders[0].nationalId = "";
  assert.equal(wizardStepStatus("people", peopleMissingFounder).completed, false);
  assert.equal(firstIncompleteWizardStep(peopleMissingFounder), 2);
  assert.equal(canNavigateToWizardStep(3, peopleMissingFounder), false);

  const managerInvalid = structuredClone(context);
  managerInvalid.form.managerDetails = { enabled: true, fullName: "", email: "bad" };
  assert.equal(wizardStepStatus("people", managerInvalid).completed, false);

  const premiseFalse = structuredClone(context);
  const premiseKey = context.profile.requirements.find((item) => ["PREMISES", "EQUIPMENT", "EVIDENCE"].includes(item.category) && item.blocking).key;
  premiseFalse.form.premisesAnswers[premiseKey] = false;
  assert.equal(wizardStepStatus("entity", premiseFalse).completed, false);

  const missingFounderDocument = structuredClone(context);
  const founderKind = Object.keys(LEGAL_LICENSE_DOCUMENT_RULES).find((kind) => LEGAL_LICENSE_DOCUMENT_RULES[kind].owner === "FOUNDER");
  missingFounderDocument.application.attachments = missingFounderDocument.application.attachments.filter((attachment) => attachment.kind !== founderKind);
  assert.equal(wizardStepStatus("documents", missingFounderDocument).completed, false);
  assert.equal(wizardStepStatus("review", missingFounderDocument).completed, false);

  const missingDeclaration = structuredClone(context);
  const declarationKey = context.profile.postLicenseDeclarations[0].key;
  missingDeclaration.form.postLicenseDeclarations[declarationKey] = false;
  assert.equal(wizardStepStatus("declaration", missingDeclaration).completed, false);
});

test("false blocking eligibility and missing application evidence stop at their human wizard steps", () => {
  const context = completeWizardContext("FINE_ARTS_GALLERY");
  const eligibilityKey = context.profile.eligibility.find((item) => item.blocking).key;
  context.form.eligibilityAnswers[eligibilityKey] = false;
  assert.equal(firstIncompleteWizardStep(context), 1);
  assert.equal(canNavigateToWizardStep(2, context), false);
  assert.match(wizardIncompleteMessage(1, "ar"), /الأهلية/);
  assert.match(wizardIncompleteMessage(1, "en"), /eligibility/i);

  context.form.eligibilityAnswers[eligibilityKey] = true;
  const appKind = Object.keys(LEGAL_LICENSE_DOCUMENT_RULES).find((kind) => LEGAL_LICENSE_DOCUMENT_RULES[kind].owner === "APPLICATION");
  context.application.attachments = context.application.attachments.filter((attachment) => attachment.kind !== appKind);
  assert.equal(firstIncompleteWizardStep(context), 4);
  assert.doesNotMatch(wizardIncompleteMessage(4, "ar"), /[A-Z_]{3,}/);
});

test("local snapshot is versioned, expires, validates nested form, and never stores a visual signature", () => {
  const now = Date.UTC(2026, 7, 2, 10);
  const context = completeWizardContext();
  const snapshot = buildLocalWizardSnapshot({ ...context, token: "secret", step: 6, now });
  assert.equal(snapshot.savedAt, now);
  assert.equal(snapshot.expiresAt, now + LOCAL_WIZARD_SNAPSHOT_TTL_MS);
  assert.equal(snapshot.form.applicantSignature, null);
  assert.doesNotMatch(JSON.stringify(snapshot), /data:image/);
  assert.deepEqual(parseLocalWizardSnapshot(JSON.stringify(snapshot), now + 1), snapshot);
  assert.equal(parseLocalWizardSnapshot(snapshot, snapshot.expiresAt + 1), null);
  assert.equal(parseLocalWizardSnapshot({ ...snapshot, form: { ...snapshot.form, applicantName: 42 } }, now), null);
  assert.equal(parseLocalWizardSnapshot({ ...snapshot, form: { ...snapshot.form, founders: ["bad"] } }, now), null);
  assert.equal(parseLocalWizardSnapshot({ ...snapshot, form: { ...snapshot.form, managerDetails: { enabled: "yes" } } }, now), null);
  assert.equal(parseLocalWizardSnapshot({ ...snapshot, form: { ...snapshot.form, eligibilityAnswers: { key: {} } } }, now), null);
});

test("tracked result binds the successful application to the exact access token", () => {
  assert.deepEqual(buildTrackedWizardResult({ id: "app-1", referenceNo: "LIC-2026-0001" }, " token "), {
    application: { id: "app-1", referenceNo: "LIC-2026-0001" },
    accessToken: "token",
  });
  assert.equal(buildTrackedWizardResult(null, "token"), null);
  assert.equal(buildTrackedWizardResult({ id: "app-1" }, ""), null);
});

test("mutation lock rejects overlap synchronously and only its owner can release", () => {
  const lock = createWizardMutationLock();
  assert.equal(lock.acquire("save"), true);
  assert.equal(lock.locked(), true);
  assert.equal(lock.acquire("upload"), false);
  assert.equal(lock.release("upload"), false);
  assert.equal(lock.locked(), true);
  assert.equal(lock.release("save"), true);
  assert.equal(lock.locked(), false);
  assert.equal(lock.acquire("submit"), true);
});
test("structured server issues map to the earliest human wizard step", () => {
  assert.equal(firstServerIssueWizardStep({
    issues: [{ key: "music.building.soundproof_rooms", scope: "PREMISES" }],
  }), 3);
  assert.equal(firstServerIssueWizardStep({
    fields: { fieldErrors: { "managerDetails.email": ["Invalid value"], address: ["Invalid value"] } },
  }), 2);
  assert.equal(firstServerIssueWizardStep({ code: "OTHER" }), null);
});
test("a suspended deficiency makes its owning step incomplete and blocks forward navigation", () => {
  const context = completeWizardContext("CULTURAL_FORUM");
  context.application.status = "SUSPENDED";
  context.application.deficiencyScopes = [{ scope: "ATTACHMENT", attachmentKind: "AUTHORIZATION" }];
  assert.equal(wizardStepStatus("documents", context).completed, false);
  assert.equal(firstIncompleteWizardStep(context), 4);
  assert.equal(canNavigateToWizardStep(5, context), false);
});
