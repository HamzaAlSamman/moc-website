import { z } from "zod";
import {
  GENERAL_LEGAL_LICENSE_DOCUMENTS,
  LEGAL_LICENSE_DOCUMENT_RULES,
  LEGAL_LICENSE_TYPES,
  validateLegalLicenseApplication,
} from "./legal-license.mjs";

const text = (max = 500) => z.string().trim().max(max).optional().default("");
const optionalEmail = z.string().trim().max(320).optional().default("").transform((value) => value.toLowerCase());
const licenseTypes = Object.keys(LEGAL_LICENSE_TYPES);

const founderDraftSchema = z.object({
  id: z.string().trim().max(128).optional(),
  fullName: text(300),
  nationalId: text(32),
  birthDate: z.string().trim().max(32).nullable().optional(),
  occupation: text(300),
  qualification: text(300),
  phone: text(32),
  email: optionalEmail,
  address: text(2_000),
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
  purpose: text(10_000),
  objectives: text(20_000),
  activityDescription: text(20_000),
  governorate: text(200),
  address: text(3_000),
  declarationAccuracy: z.boolean().optional().default(false),
  declarationResponsibility: z.boolean().optional().default(false),
  declarationPrivacy: z.boolean().optional().default(false),
  applicantSignature: z.string().max(2_000_000).nullable().optional().default(null),
  founders: z.array(founderDraftSchema).max(100).optional().default([]),
}).strip();

export function normalizeLegalLicenseDraft(input) {
  return legalLicenseDraftSchema.parse(input);
}

export function requiredLegalLicenseDocumentKinds(licenseType) {
  const config = LEGAL_LICENSE_TYPES[licenseType];
  if (!config) throw new Error("Invalid legal-license type");
  return [...new Set([
    ...GENERAL_LEGAL_LICENSE_DOCUMENTS.map((document) => document.kind),
    ...config.additionalDocuments,
  ])];
}

export function validateLegalLicenseSubmissionRecord(record) {
  const normalized = validateLegalLicenseApplication(record);
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
  return normalized;
}

export function legalLicenseApplicationWriteData(draft) {
  const { founders: _founders, ...application } = normalizeLegalLicenseDraft(draft);
  return application;
}

export function legalLicenseFounderWriteData(draft) {
  const parsed = founderDraftSchema.parse(draft);
  return {
    fullName: parsed.fullName || null,
    nationalId: parsed.nationalId || null,
    birthDate: parsed.birthDate ? new Date(parsed.birthDate) : null,
    occupation: parsed.occupation || null,
    qualification: parsed.qualification || null,
    phone: parsed.phone || null,
    email: parsed.email || null,
    address: parsed.address || null,
    isAuthorizedRepresentative: parsed.isAuthorizedRepresentative,
  };
}
