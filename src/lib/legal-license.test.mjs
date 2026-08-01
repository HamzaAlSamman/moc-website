import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  GENERAL_LEGAL_LICENSE_DOCUMENTS,
  LEGAL_LICENSE_TYPES,
  canTransitionLegalLicense,
  toPublicLegalLicenseApplication,
  validateLegalLicenseApplication,
} from "./legal-license.mjs";

const VALID_APPLICATION = {
  applicantName: "أحمد محمد",
  nationalId: "01234567890",
  phone: "+963944444444",
  email: "applicant@example.com",
  capacity: "المفوض بالتوقيع",
  licenseType: "CULTURAL_FORUM",
  entityName: "ملتقى الثقافة السورية",
  purpose: "تعزيز المشاركة الثقافية",
  objectives: "تنظيم الأنشطة والحوارات الثقافية",
  activityDescription: "ندوات وورشات ثقافية دورية",
  governorate: "دمشق",
  address: "دمشق - الروضة",
  founders: [
    {
      fullName: "أحمد محمد",
      nationalId: "01234567891",
      phone: "0999999999",
      email: "founder@example.com",
      isAuthorizedRepresentative: true,
    },
  ],
  declarationAccuracy: true,
  declarationResponsibility: true,
  declarationPrivacy: true,
  applicantSignature: "data:image/png;base64,iVBORw0KGgo=",
};

test("legal-license catalog exposes the ten stable bilingual license types", () => {
  const expected = [
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

  assert.deepEqual(Object.keys(LEGAL_LICENSE_TYPES), expected);
  for (const value of expected) {
    const type = LEGAL_LICENSE_TYPES[value];
    assert.equal(type.value, value);
    assert.match(type.slug, /^[a-z0-9-]+$/);
    assert.ok(type.label.ar);
    assert.ok(type.label.en);
    assert.ok(Array.isArray(type.additionalDocuments));
  }
  assert.ok(Array.isArray(GENERAL_LEGAL_LICENSE_DOCUMENTS));
  assert.ok(GENERAL_LEGAL_LICENSE_DOCUMENTS.length > 0);
});

test("a complete legal-license application is valid", () => {
  const result = validateLegalLicenseApplication(VALID_APPLICATION);
  assert.equal(result.licenseType, "CULTURAL_FORUM");
  assert.equal(result.founders.length, 1);
});

test("legal-license validation requires applicant and entity fields", () => {
  for (const field of [
    "applicantName", "nationalId", "phone", "email", "capacity", "entityName",
    "purpose", "objectives", "activityDescription", "governorate", "address",
  ]) {
    assert.throws(
      () => validateLegalLicenseApplication({ ...VALID_APPLICATION, [field]: "" }),
      new RegExp(field),
    );
  }
});

test("legal-license validation checks identity and contact formats", () => {
  assert.throws(
    () => validateLegalLicenseApplication({ ...VALID_APPLICATION, nationalId: "123" }),
    /nationalId/,
  );
  assert.throws(
    () => validateLegalLicenseApplication({ ...VALID_APPLICATION, phone: "not-a-phone" }),
    /phone/,
  );
  assert.throws(
    () => validateLegalLicenseApplication({ ...VALID_APPLICATION, email: "invalid" }),
    /email/,
  );
  assert.throws(
    () => validateLegalLicenseApplication({ ...VALID_APPLICATION, licenseType: "UNKNOWN" }),
    /licenseType/,
  );
});

test("legal-license validation enforces founders and exactly one representative", () => {
  assert.throws(
    () => validateLegalLicenseApplication({ ...VALID_APPLICATION, founders: [] }),
    /founders/,
  );
  assert.throws(
    () => validateLegalLicenseApplication({
      ...VALID_APPLICATION,
      founders: VALID_APPLICATION.founders.map((founder) => ({ ...founder, isAuthorizedRepresentative: false })),
    }),
    /representative/,
  );
  assert.throws(
    () => validateLegalLicenseApplication({
      ...VALID_APPLICATION,
      founders: [
        VALID_APPLICATION.founders[0],
        { ...VALID_APPLICATION.founders[0], fullName: "مؤسس ثان", isAuthorizedRepresentative: false },
      ],
    }),
    /duplicate nationalId/,
  );
});

test("legal-license validation requires all declarations and a signature", () => {
  for (const field of ["declarationAccuracy", "declarationResponsibility", "declarationPrivacy"]) {
    assert.throws(
      () => validateLegalLicenseApplication({ ...VALID_APPLICATION, [field]: false }),
      new RegExp(field),
    );
  }
  assert.throws(
    () => validateLegalLicenseApplication({ ...VALID_APPLICATION, applicantSignature: "" }),
    /applicantSignature/,
  );
});

test("legal-license workflow is stage-owned and terminal states never move", () => {
  assert.equal(canTransitionLegalLicense("CITIZEN", "DRAFT", "SUBMITTED"), true);
  assert.equal(canTransitionLegalLicense("CITIZEN", "SUSPENDED", "UNDER_REVIEW"), true);
  assert.equal(canTransitionLegalLicense("LICENSING_OFFICER", "SUBMITTED", "UNDER_REVIEW"), true);
  assert.equal(canTransitionLegalLicense("LICENSING_OFFICER", "UNDER_REVIEW", "COMMITTEE_REVIEW"), true);
  assert.equal(canTransitionLegalLicense("LICENSING_OFFICER", "UNDER_REVIEW", "SUSPENDED"), true);
  assert.equal(canTransitionLegalLicense("LICENSING_COMMITTEE", "COMMITTEE_REVIEW", "LEGAL_APPROVAL"), true);
  assert.equal(canTransitionLegalLicense("LEGAL_DIRECTOR", "LEGAL_APPROVAL", "MINISTER_APPROVAL"), true);
  assert.equal(canTransitionLegalLicense("DEPUTY_MINISTER", "MINISTER_APPROVAL", "APPROVED"), true);
  assert.equal(canTransitionLegalLicense("DEPUTY_MINISTER", "MINISTER_APPROVAL", "REJECTED"), true);
  assert.equal(canTransitionLegalLicense("LICENSING_OFFICER", "APPROVED", "LICENSE_ISSUED"), true);
  assert.equal(canTransitionLegalLicense("LICENSING_OFFICER", "LICENSE_ISSUED", "COMPLETED"), true);

  assert.equal(canTransitionLegalLicense("CITIZEN", "SUBMITTED", "APPROVED"), false);
  assert.equal(canTransitionLegalLicense("LICENSING_OFFICER", "COMMITTEE_REVIEW", "APPROVED"), false);
  assert.equal(canTransitionLegalLicense("ADMIN", "SUBMITTED", "COMPLETED"), false);
  assert.equal(canTransitionLegalLicense("SUPER_ADMIN", "UNDER_REVIEW", "COMMITTEE_REVIEW"), true);
  assert.equal(canTransitionLegalLicense("ADMIN", "REJECTED", "REJECTED"), false);
  assert.equal(canTransitionLegalLicense("SUPER_ADMIN", "COMPLETED", "UNDER_REVIEW"), false);
});

test("public legal-license DTO strips tokens, storage keys and internal review data", () => {
  const createdAt = new Date("2026-07-31T10:00:00Z");
  const dto = toPublicLegalLicenseApplication({
    ...VALID_APPLICATION,
    id: "license-1",
    referenceNo: "LIC-2026-0001",
    status: "SUSPENDED",
    revision: 2,
    deficiencyNote: "صورة الهوية غير واضحة",
    accessTokenHash: "secret-token-hash",
    committeeRecommendation: "internal committee recommendation",
    ministerDecision: "internal minister decision",
    internalMemo: "internal",
    founders: [{
      id: "founder-1",
      applicationId: "license-1",
      ...VALID_APPLICATION.founders[0],
      birthDate: createdAt,
      occupation: "Teacher",
      qualification: "BA",
      internalNote: "secret",
    }],
    attachments: [{
      id: "attachment-1",
      kind: "NATIONAL_ID_FRONT",
      originalName: "id.pdf",
      mimeType: "application/pdf",
      size: 123,
      version: 1,
      createdAt,
      storageKey: "private/path/id.pdf",
      applicationId: "license-1",
      founderId: "founder-1",
    }],
    history: [{
      id: "history-1",
      fromStatus: "UNDER_REVIEW",
      toStatus: "SUSPENDED",
      action: "REQUEST_DEFICIENCIES",
      publicNote: "يرجى إعادة رفع الهوية",
      note: "internal note",
      actorId: "staff-1",
      actorEmail: "staff@moc.gov.sy",
      createdAt,
    }],
    createdAt,
    updatedAt: createdAt,
  });

  assert.equal(dto.referenceNo, "LIC-2026-0001");
  assert.equal(dto.deficiencyNote, "صورة الهوية غير واضحة");
  assert.deepEqual(Object.keys(dto.attachments[0]), [
    "id", "founderId", "kind", "originalName", "mimeType", "size", "version", "createdAt",
  ]);
  assert.deepEqual(Object.keys(dto.history[0]), [
    "id", "fromStatus", "toStatus", "action", "publicNote", "createdAt",
  ]);
  assert.equal(dto.founders[0].occupation, "Teacher");
  assert.equal(dto.founders[0].qualification, "BA");
  assert.equal(dto.attachments[0].founderId, "founder-1");
  assert.equal("applicationId" in dto.founders[0], false);
  for (const privateField of ["accessTokenHash", "storageKey", "internalMemo", "committeeRecommendation", "ministerDecision"]) {
    assert.equal(privateField in dto, false, `${privateField} must not be public`);
  }
});

test("legal-license roles and permissions are wired into the shared permission registry", () => {
  const permissions = readFileSync(new URL("./permissions.js", import.meta.url), "utf8");
  assert.match(permissions, /LICENSING_OFFICER:\s*"LICENSING_OFFICER"/);
  assert.match(permissions, /LICENSING_COMMITTEE:\s*"LICENSING_COMMITTEE"/);
  assert.match(permissions, /VIEW_LEGAL_LICENSES:/);
  assert.match(permissions, /MANAGE_LEGAL_LICENSES:/);
});

test("legal-license persistence schema and reference prefix are declared", () => {
  const schema = readFileSync(new URL("../../prisma/schema.prisma", import.meta.url), "utf8");
  const referenceNumbers = readFileSync(new URL("./reference-number.js", import.meta.url), "utf8");
  const migration = readFileSync(
    new URL("../../prisma/migrations_manual/2026-07-31_legal_license_service.sql", import.meta.url),
    "utf8",
  );
  for (const declaration of ["enum LegalLicenseType", "enum LegalLicenseStatus", "enum LegalLicenseAttachmentKind", "model LegalLicenseApplication", "model LegalLicenseFounder", "model LegalLicenseAttachment", "model LegalLicenseHistory"]) {
    assert.match(schema, new RegExp(declaration));
  }
  assert.match(schema, /applicantName\s+String\?/);
  assert.match(schema, /licenseType\s+LegalLicenseType\?/);
  assert.match(migration, /"applicantName" TEXT,/);
  assert.doesNotMatch(migration, /"applicantName" TEXT NOT NULL/);
  assert.match(referenceNumbers, /LEGAL_LICENSE:\s*"LIC"/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "LegalLicenseApplication"/);
  assert.match(migration, /ADD VALUE IF NOT EXISTS 'LICENSING_OFFICER'/);
  assert.match(migration, /ADD VALUE IF NOT EXISTS 'LICENSING_COMMITTEE'/);
});

test("guided legal-license persistence declares review state and structured review items", () => {
  const schema = readFileSync(new URL("../../prisma/schema.prisma", import.meta.url), "utf8");
  const migration = readFileSync(
    new URL("../../prisma/migrations_manual/2026-07-31_legal_license_guided_documents.sql", import.meta.url),
    "utf8",
  );

  assert.match(
    schema,
    /enum LegalLicenseReviewStatus\s*{\s*PENDING\s+ACCEPTED\s+DEFICIENT\s+NOT_APPLICABLE\s*}/s,
  );
  assert.match(schema, /model LegalLicenseReviewItem\s*{[\s\S]*?id\s+String\s+@id\s+@default\(cuid\(\)\)/);
  for (const field of [
    "applicationId\\s+String",
    "applicationRevision\\s+Int",
    "requirementKey\\s+String",
    "scope\\s+String",
    "subjectRef\\s+String\\?",
    "status\\s+LegalLicenseReviewStatus\\s+@default\\(PENDING\\)",
    "note\\s+String\\?\\s+@db\\.Text",
    "publicNote\\s+String\\?\\s+@db\\.Text",
    "reviewerId\\s+String\\?",
    "reviewerEmail\\s+String\\?",
    "reviewerName\\s+String\\?",
    "reviewedAt\\s+DateTime\\?",
    "createdAt\\s+DateTime\\s+@default\\(now\\(\\)\\)",
    "updatedAt\\s+DateTime\\s+@updatedAt",
  ]) {
    assert.match(schema, new RegExp(field));
  }
  assert.match(
    schema,
    /application\s+LegalLicenseApplication\s+@relation\(fields:\s*\[applicationId\],\s*references:\s*\[id\],\s*onDelete:\s*Restrict\)/,
  );
  assert.match(schema, /@@unique\(\[applicationId, applicationRevision, requirementKey, subjectRef\], map: "LLReview_app_revision_requirement_subject_key"\)/);
  assert.match(schema, /@@index\(\[applicationId, applicationRevision\]\)/);
  assert.match(schema, /reviewItems\s+LegalLicenseReviewItem\[\]/);
  assert.match(
    schema,
    /model LegalLicenseHistory\s*{[\s\S]*?application\s+LegalLicenseApplication\s+@relation\([^\n]*onDelete:\s*Restrict\)/,
  );

  assert.match(migration, /CREATE TYPE "LegalLicenseReviewStatus"/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "LegalLicenseReviewItem"/);
  assert.match(migration, /ON DELETE RESTRICT/);
  assert.match(
    migration,
    /CREATE UNIQUE INDEX IF NOT EXISTS "LLReview_app_revision_requirement_null_subject_key"[\s\S]*WHERE "subjectRef" IS NULL/,
  );
});

test("guided answers and generated document metadata are additive and nullable", () => {
  const schema = readFileSync(new URL("../../prisma/schema.prisma", import.meta.url), "utf8");
  const migration = readFileSync(
    new URL("../../prisma/migrations_manual/2026-07-31_legal_license_guided_documents.sql", import.meta.url),
    "utf8",
  );

  for (const field of [
    "eligibilityAnswers", "premisesAnswers", "bylawAnswers", "requirementSnapshot", "deficiencyScopes",
  ]) {
    assert.match(schema, new RegExp(`${field}\\s+Json\\?`));
    assert.match(migration, new RegExp(`ADD COLUMN IF NOT EXISTS "${field}" JSONB`));
  }
  assert.match(schema, /documentTemplateVersion\s+String\?/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "documentTemplateVersion" TEXT/);

  for (const kind of [
    "APPLICATION_DOCX",
    "BYLAWS_PDF",
    "BYLAWS_DOCX",
    "REQUIREMENTS_CHECKLIST_PDF",
    "TECHNICAL_SUMMARY_PDF",
  ]) {
    assert.match(schema, new RegExp(`\\b${kind}\\b`));
    assert.match(migration, new RegExp(`ADD VALUE IF NOT EXISTS '${kind}'`));
  }

  assert.match(schema, /templateVersion\s+String\?/);
  assert.match(schema, /verificationCode\s+String\?\s+@unique/);
  assert.match(schema, /generatedAt\s+DateTime\?/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "templateVersion" TEXT/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "verificationCode" TEXT/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "generatedAt" TIMESTAMP\(3\)/);
});

test("legal-license server loads review items in deterministic revision and requirement order", () => {
  const server = readFileSync(new URL("./legal-license-server.js", import.meta.url), "utf8");
  assert.match(
    server,
    /reviewItems:\s*{\s*orderBy:\s*\[\s*{\s*applicationRevision:\s*"asc"\s*},\s*{\s*scope:\s*"asc"\s*},\s*{\s*requirementKey:\s*"asc"\s*},?\s*\]\s*,?\s*}\s*,?/s,
  );
});

test("guided review migration uses PostgreSQL-safe index and constraint names", () => {
  const migration = readFileSync(
    new URL("../../prisma/migrations_manual/2026-07-31_legal_license_guided_documents.sql", import.meta.url),
    "utf8",
  );
  const declaredNames = [...migration.matchAll(/(?:CONSTRAINT|INDEX IF NOT EXISTS)\s+"([^"]+)"/g)]
    .map((match) => match[1]);
  assert.ok(declaredNames.length > 0);
  for (const name of declaredNames) {
    assert.ok(name.length <= 63, `${name} exceeds PostgreSQL's 63-byte identifier limit`);
  }
});