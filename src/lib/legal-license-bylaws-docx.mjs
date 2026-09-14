import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const BYLAWS_TEMPLATES = Object.freeze({
  CULTURAL_FORUM: {
    fileName: "model-cultural-forum-bylaws.docx",
    entityLabel: "ملتقى ثقافي",
    definiteEntityLabel: "الملتقى الثقافي",
    feminine: false,
  },
  CULTURAL_HOUSE: {
    fileName: "model-cultural-house-bylaws.docx",
    entityLabel: "دار ثقافية",
    definiteEntityLabel: "الدار الثقافية",
    feminine: true,
  },
  CULTURAL_ASSOCIATION: {
    fileName: "model-cultural-association-bylaws.docx",
    entityLabel: "رابطة ثقافية",
    definiteEntityLabel: "الرابطة الثقافية",
    feminine: true,
  },
  AMATEUR_TROUPE: {
    fileName: "model-amateur-troupe-bylaws.docx",
    entityLabel: "فرقة هواة",
    definiteEntityLabel: "فرقة الهواة",
    feminine: true,
  },
});

const CONTROL_CHARS_RE = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]",
  "g",
);
const PARAGRAPH_RE = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
const TEXT_RE = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;

function cleanText(value, fallback = "غير مدخل") {
  const cleaned = String(value ?? "")
    .replace(CONTROL_CHARS_RE, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

function xmlDecode(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paragraphText(paragraph) {
  return xmlDecode([...paragraph.matchAll(TEXT_RE)].map((match) => match[1]).join(""));
}

function replaceParagraphText(paragraph, value) {
  const open = paragraph.match(/^<w:p(?:\s[^>]*)?>/)?.[0] || "<w:p>";
  const paragraphProperties = paragraph.match(/<w:pPr(?:\s[^>]*)?>[\s\S]*?<\/w:pPr>/)?.[0] || "";
  const runProperties = paragraph.match(/<w:rPr(?:\s[^>]*)?>[\s\S]*?<\/w:rPr>/)?.[0] || "";
  return `${open}${paragraphProperties}<w:r>${runProperties}<w:t xml:space="preserve">${xmlEscape(value)}</w:t></w:r></w:p>`;
}

function firstIndexAfter(paragraphs, start, predicate) {
  for (let index = start; index < paragraphs.length; index += 1) {
    if (predicate(paragraphText(paragraphs[index]).trim())) return index;
  }
  return -1;
}

function objectiveLines(value) {
  const lines = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•*\-–—]+/, "").trim())
    .filter(Boolean);
  return lines.length ? lines : ["غير مدخل"];
}

function isoDate(value) {
  if (!value) return "غير مدخل";
  if (typeof value === "string") return cleanText(value.slice(0, 10));
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return cleanText(value);
}

function ageAtDownload(value) {
  if (!value) return "غير مدخل";
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return "غير مدخل";
  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayPassed = today.getUTCMonth() > birthDate.getUTCMonth()
    || (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() >= birthDate.getUTCDate());
  if (!birthdayPassed) age -= 1;
  return age >= 0 && age <= 130 ? `${age} سنة` : "غير مدخل";
}

function applicantLine(application) {
  return [
    `بيانات مقدم الطلب: الاسم واللقب: ${cleanText(application.applicantName)}`,
    `الصفة: ${cleanText(application.capacity)}`,
    `الرقم الوطني: ${cleanText(application.nationalId)}`,
    `الهاتف: ${cleanText(application.phone)}`,
    `البريد الإلكتروني: ${cleanText(application.email)}`,
  ].join("؛ ");
}

function founderLine(founder, index) {
  return [
    `${index + 1}. الاسم واللقب والنسب: ${cleanText(founder.fullName)}`,
    `السن: ${ageAtDownload(founder.birthDate)}`,
    `تاريخ الميلاد: ${isoDate(founder.birthDate)}`,
    `الجنسية: ${cleanText(founder.nationality)}`,
    `الرقم الوطني: ${cleanText(founder.nationalId)}`,
    `المهنة: ${cleanText(founder.occupation)}`,
    `المؤهل العلمي: ${cleanText(founder.qualification)}`,
    `الموطن: ${cleanText(founder.address)}`,
  ].join("؛ ");
}

function fillDocumentXml(documentXml, application, template) {
  const paragraphs = documentXml.match(PARAGRAPH_RE) || [];
  const materialOne = firstIndexAfter(paragraphs, 0, (text) => /^مادة\s*1\s*[–-]/.test(text));
  const materialTwo = firstIndexAfter(paragraphs, materialOne + 1, (text) => /^مادة\s*2\s*[–-]/.test(text));
  const afterPurposes = firstIndexAfter(paragraphs, materialTwo + 1, (text) => text.startsWith("لا يجوز"));
  const materialThree = firstIndexAfter(paragraphs, afterPurposes + 1, (text) => /^مادة\s*3\s*[–-]/.test(text));
  const founderConditions = firstIndexAfter(paragraphs, materialThree + 1, (text) => text.startsWith("يشترط في العضو المؤسس"));

  if ([materialOne, materialTwo, afterPurposes, materialThree, founderConditions].some((index) => index < 0)) {
    throw new Error("The model bylaws template does not contain the expected editable clauses");
  }

  const possession = template.feminine
    ? "وتتمتع بالشخصية الاعتبارية وتكون لها مالية مستقلة ولها الحق في تملك الأموال المنقولة والتصرف بها في حدود تحقيق أهدافها."
    : "ويتمتع بالشخصية الاعتبارية وتكون له مالية مستقلة وله الحق في تملك الأموال المنقولة والتصرف بها في حدود تحقيق أهدافه.";
  const articleOne = `مادة 1– : تُؤسس في الجمهورية العربية السورية / محافظة ${cleanText(application.governorate)} – عنوان المقر: ${cleanText(application.address)}/ ${template.entityLabel} باسم ${cleanText(application.entityName)}، ${possession}`;
  const articleTwo = `مادة 2– : أغراض ${template.definiteEntityLabel} هي الأهداف الآتية:`;
  const objectives = objectiveLines(application.objectives);
  const founders = Array.isArray(application.founders) ? application.founders : [];

  const replacements = new Map([
    [materialOne, [replaceParagraphText(paragraphs[materialOne], articleOne)]],
    [materialTwo, [
      replaceParagraphText(paragraphs[materialTwo], articleTwo),
      ...objectives.map((objective) => replaceParagraphText(paragraphs[Math.min(materialTwo + 1, afterPurposes - 1)], `• ${objective}`)),
    ]],
    [materialThree, [
      paragraphs[materialThree],
      ...(founders.length
        ? founders.map((founder, index) => replaceParagraphText(paragraphs[Math.min(materialThree + 1, founderConditions - 1)], founderLine(founder, index)))
        : [replaceParagraphText(paragraphs[Math.min(materialThree + 1, founderConditions - 1)], "لا يوجد مؤسسون مدخلون في الطلب.")]),
      replaceParagraphText(paragraphs[Math.min(materialThree + 1, founderConditions - 1)], applicantLine(application)),
    ]],
  ]);

  const removed = new Set();
  for (let index = materialTwo + 1; index < afterPurposes; index += 1) removed.add(index);

  let paragraphIndex = 0;
  return documentXml.replace(PARAGRAPH_RE, (paragraph) => {
    const index = paragraphIndex;
    paragraphIndex += 1;
    if (removed.has(index)) return "";
    return replacements.has(index) ? replacements.get(index).join("") : paragraph;
  });
}

export function supportsGeneratedLegalLicenseBylaws(licenseType) {
  return Object.hasOwn(BYLAWS_TEMPLATES, licenseType);
}

export async function generateCompletedLegalLicenseBylawsDocx(application) {
  const template = BYLAWS_TEMPLATES[application?.licenseType];
  if (!template) throw new Error("This license type does not have generated model bylaws");

  const templatePath = path.join(process.cwd(), "public", "documents", "legal-licenses", template.fileName);
  const source = await readFile(templatePath);
  const archive = await JSZip.loadAsync(source);
  const documentPart = archive.file("word/document.xml");
  if (!documentPart) throw new Error("The model bylaws template is missing word/document.xml");

  const documentXml = await documentPart.async("string");
  archive.file("word/document.xml", fillDocumentXml(documentXml, application, template));
  return archive.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
