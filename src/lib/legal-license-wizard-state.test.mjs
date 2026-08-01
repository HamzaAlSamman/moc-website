import assert from "node:assert/strict";
import test from "node:test";

import {
  LEGAL_LICENSE_WIZARD_STEPS,
  buildLocalWizardSnapshot,
  canNavigateToWizardStep,
  firstDeficientWizardStep,
  isWizardAttachmentEditable,
  isWizardFieldEditable,
  isWizardRequirementEditable,
  isWizardStepEditable,
  mapDeficiencyToWizardStep,
  parseLocalWizardSnapshot,
  wizardStepStatus,
} from "./legal-license-wizard-state.mjs";
import { getLegalLicenseRequirementProfile } from "./legal-license-requirements.mjs";

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
