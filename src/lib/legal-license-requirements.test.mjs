import assert from "node:assert/strict";
import { test } from "node:test";
import { LEGAL_LICENSE_DOCUMENT_RULES } from "./legal-license.mjs";
import {
  LEGAL_LICENSE_REQUIREMENT_CATEGORIES,
  LEGAL_LICENSE_REQUIREMENT_PROFILES,
  LEGAL_LICENSE_SOURCE_DOCUMENTS,
  getApplicableLegalLicenseRequirements,
  getLegalLicenseRequirementProfile,
  legalLicenseRequiresBylaws,
} from "./legal-license-requirements.mjs";

const EXPECTED_LICENSE_TYPES = [
  "CULTURAL_FORUM",
  "CULTURAL_HOUSE",
  "CULTURAL_ASSOCIATION",
  "AMATEUR_TROUPE",
  "CINEMA_ARTS",
  "FINE_ARTS",
  "HERITAGE_MUSEUM",
  "MUSIC_INSTITUTE",
  "THEATER_INSTITUTE",
  "FINE_ARTS_GALLERY",
];

const QUESTION_GROUPS = [
  "eligibility",
  "applicant",
  "premises",
  "equipment",
  "evidence",
  "bylawQuestions",
  "postLicenseDeclarations",
];

test("the regulatory catalog exposes exactly ten immutable license profiles", () => {
  assert.deepEqual(Object.keys(LEGAL_LICENSE_REQUIREMENT_PROFILES), EXPECTED_LICENSE_TYPES);
  assert.equal(Object.isFrozen(LEGAL_LICENSE_REQUIREMENT_PROFILES), true);

  for (const type of EXPECTED_LICENSE_TYPES) {
    const profile = getLegalLicenseRequirementProfile(type);
    assert.equal(profile.licenseType, type);
    assert.equal(Object.isFrozen(profile), true);
    assert.equal(Object.isFrozen(profile.attachmentKinds), true);
  }
});

test("profiles reference only attachment kinds already accepted by the legal-license domain", () => {
  const validKinds = new Set(Object.keys(LEGAL_LICENSE_DOCUMENT_RULES));
  for (const profile of Object.values(LEGAL_LICENSE_REQUIREMENT_PROFILES)) {
    assert.ok(profile.attachmentKinds.length > 0, `${profile.licenseType} needs evidence kinds`);
    for (const kind of profile.attachmentKinds) {
      assert.ok(validKinds.has(kind), `${profile.licenseType} has unknown attachment kind ${kind}`);
    }
  }
});

test("every guided question has a stable bilingual and attributable contract", () => {
  const categories = new Set(Object.values(LEGAL_LICENSE_REQUIREMENT_CATEGORIES));
  const answerTypes = new Set(["BOOLEAN", "TEXT", "NUMBER", "SELECT", "DATE"]);

  for (const profile of Object.values(LEGAL_LICENSE_REQUIREMENT_PROFILES)) {
    for (const group of QUESTION_GROUPS) {
      assert.equal(Object.isFrozen(profile[group]), true, `${profile.licenseType}.${group} must be immutable`);
      for (const question of profile[group]) {
        assert.match(question.key, /^[a-z][a-z0-9]*(?:[._][a-z0-9]+)+$/);
        assert.ok(categories.has(question.category));
        assert.ok(answerTypes.has(question.answerType));
        assert.equal(typeof question.blocking, "boolean");
        assert.ok(question.label.ar && question.label.en);
        assert.ok(question.help.ar && question.help.en);
        assert.ok(LEGAL_LICENSE_SOURCE_DOCUMENTS[question.source.document]);
        assert.ok(question.source.article);
        assert.equal(Object.isFrozen(question), true);
        assert.equal(Object.isFrozen(question.label), true);
        assert.equal(Object.isFrozen(question.source), true);
      }
    }
  }
});

test("the six supplied decisions link each regulated type to the correct public PDF", () => {
  const expected = {
    FINE_ARTS: ["fine-arts", "/documents/legal-licenses/fine-arts.pdf"],
    CINEMA_ARTS: ["cinema-arts", "/documents/legal-licenses/cinema-arts.pdf"],
    HERITAGE_MUSEUM: ["heritage-museums", "/documents/legal-licenses/heritage-museums.pdf"],
    THEATER_INSTITUTE: ["theater-institutes", "/documents/legal-licenses/theater-institutes.pdf"],
    MUSIC_INSTITUTE: ["music-institutes", "/documents/legal-licenses/music-institutes.pdf"],
    FINE_ARTS_GALLERY: ["fine-arts-galleries", "/documents/legal-licenses/fine-arts-galleries.pdf"],
  };

  for (const [type, [documentKey, publicUrl]] of Object.entries(expected)) {
    const profile = getLegalLicenseRequirementProfile(type);
    assert.equal(profile.sourceDocuments[0], documentKey);
    assert.equal(LEGAL_LICENSE_SOURCE_DOCUMENTS[documentKey].publicUrl, publicUrl);
    assert.equal(profile.pendingOfficialGuidance, false);
  }

  const profile = getLegalLicenseRequirementProfile("MUSIC_INSTITUTE");
  assert.equal(profile.sourceDocuments[0], "music-institutes");
  assert.ok(profile.eligibility.every((item) => item.source.article));
  assert.equal(profile.generatesBylaws, false);
});

test("the three cultural-entity profiles generate the locked model bylaws", () => {
  for (const type of ["CULTURAL_FORUM", "CULTURAL_ASSOCIATION", "CULTURAL_HOUSE"]) {
    const profile = getLegalLicenseRequirementProfile(type);
    assert.equal(profile.generatesBylaws, true);
    assert.equal(profile.sourceDocuments.includes("model-cultural-bylaws"), true);
    assert.equal(legalLicenseRequiresBylaws(type), true);
  }
  assert.equal(legalLicenseRequiresBylaws("AMATEUR_TROUPE"), false);
});

test("types without supplied type-specific conditions remain gated pending official guidance", () => {
  for (const type of ["CULTURAL_FORUM", "CULTURAL_ASSOCIATION", "CULTURAL_HOUSE", "AMATEUR_TROUPE"]) {
    const profile = getLegalLicenseRequirementProfile(type);
    assert.equal(profile.pendingOfficialGuidance, true);
    assert.equal(profile.gated, true);
  }
});

test("requirement keys are globally unique and applicable lookups preserve the profile contract", () => {
  const requirements = Object.values(LEGAL_LICENSE_REQUIREMENT_PROFILES)
    .flatMap((profile) => getApplicableLegalLicenseRequirements(profile.licenseType));
  const keys = requirements.map((requirement) => requirement.key);
  assert.equal(new Set(keys).size, keys.length);

  const musicRequirements = getApplicableLegalLicenseRequirements("MUSIC_INSTITUTE");
  assert.ok(musicRequirements.some((item) => item.key === "music.building.soundproof_rooms"));
  assert.equal(getLegalLicenseRequirementProfile("UNKNOWN"), null);
  assert.deepEqual(getApplicableLegalLicenseRequirements("UNKNOWN"), []);
});

test("the gallery eligibility question preserves both alternatives and the public-employment condition", () => {
  const profile = getLegalLicenseRequirementProfile("FINE_ARTS_GALLERY");
  const question = profile.eligibility.find((item) => item.key === "gallery.applicant.union_member_or_manager_contract");
  assert.ok(question);
  assert.match(question.label.ar, /غير العاملين في الدولة/);
  assert.match(question.label.ar, /عقد/);
  assert.equal(question.source.article, "المادة 3/2-3");
});
