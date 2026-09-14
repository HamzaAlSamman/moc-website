import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { generateCompletedLegalLicenseBylawsDocx } from "./legal-license-bylaws-docx.mjs";
import { convertLegalLicenseDocxToPdf } from "./legal-license-docx-pdf.js";
import { generateLegalLicensePdf } from "./legal-license-pdf.js";
import { currentLegalLicenseAttachments } from "./legal-license-pdf-package-core.mjs";
import {
  LEGAL_LICENSE_SOURCE_DOCUMENTS,
  getLegalLicenseRequirementProfile,
} from "./legal-license-requirements.mjs";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const A4 = Object.freeze({ width: 595.28, height: 841.89, margin: 36 });

async function appendPdf(target, bytes, label) {
  let source;
  try {
    source = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    throw new Error(`Unable to include PDF document: ${label}`, { cause: error });
  }
  const pages = await target.copyPages(source, source.getPageIndices());
  for (const page of pages) target.addPage(page);
}

async function appendImage(target, bytes, mimeType, label) {
  let image;
  if (mimeType === "image/png") {
    image = await target.embedPng(bytes);
  } else {
    let jpegBytes;
    try {
      jpegBytes = await sharp(bytes)
        .rotate()
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
        .toBuffer();
    } catch (error) {
      throw new Error(`Unable to include image document: ${label}`, { cause: error });
    }
    image = await target.embedJpg(jpegBytes);
  }
  const availableWidth = A4.width - (A4.margin * 2);
  const availableHeight = A4.height - (A4.margin * 2);
  const scale = Math.min(availableWidth / image.width, availableHeight / image.height, 1);
  const width = image.width * scale;
  const height = image.height * scale;
  const page = target.addPage([A4.width, A4.height]);
  page.drawImage(image, {
    x: (A4.width - width) / 2,
    y: (A4.height - height) / 2,
    width,
    height,
  });
}

export async function generateLegalLicensePackagePdf(application, { readAttachmentBytes }) {
  if (typeof readAttachmentBytes !== "function") throw new TypeError("readAttachmentBytes is required");
  const target = await PDFDocument.create();
  const applicationPdf = await generateLegalLicensePdf(application);
  await appendPdf(target, applicationPdf, "application");

  const profile = getLegalLicenseRequirementProfile(application.licenseType);
  for (const sourceKey of profile?.sourceDocuments || []) {
    const source = LEGAL_LICENSE_SOURCE_DOCUMENTS[sourceKey];
    if (!source?.publicUrl || source.format === "DOCX" || source.kind === "MODEL_BYLAWS") continue;
    const sourcePath = path.join(PUBLIC_DIR, ...source.publicUrl.split("/").filter(Boolean));
    await appendPdf(target, await fs.readFile(sourcePath), source.label.ar);
  }

  if (profile?.generatesBylaws) {
    const label = "النظام الأساسي المستكمل ببيانات الطلب (بما يتوافق مع النظام الداخلي الاسترشادي)";
    const docx = await generateCompletedLegalLicenseBylawsDocx(application);
    const pdf = await convertLegalLicenseDocxToPdf(docx, label);
    await appendPdf(target, pdf, label);
  }

  for (const attachment of currentLegalLicenseAttachments(application.attachments)) {
    if (profile?.generatesBylaws && attachment.kind === "ARTICLES_OF_ASSOCIATION") continue;
    const bytes = await readAttachmentBytes(attachment);
    if (!bytes?.length) throw new Error(`Uploaded document is unavailable: ${attachment.originalName}`);
    if (attachment.mimeType === "application/pdf") {
      await appendPdf(target, bytes, attachment.originalName);
    } else if (attachment.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      await appendPdf(target, await convertLegalLicenseDocxToPdf(bytes, attachment.originalName), attachment.originalName);
    } else if (["image/jpeg", "image/png", "image/webp"].includes(attachment.mimeType)) {
      await appendImage(target, bytes, attachment.mimeType, attachment.originalName);
    } else {
      throw new Error(`Unsupported uploaded document type: ${attachment.mimeType}`);
    }
  }

  target.setTitle(`Legal license application ${application.referenceNo || application.id}`);
  target.setSubject("Complete application, completed bylaws, uploaded documents, and visual signatures");
  target.setProducer("Syrian Ministry of Culture");
  return Buffer.from(await target.save({ useObjectStreams: true, addDefaultPage: false }));
}
