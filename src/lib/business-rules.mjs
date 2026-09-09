export const MAX_COPYRIGHT_WORK_BYTES = 100 * 1024 * 1024;

const COPYRIGHT_TRANSITIONS = {
  FINANCE: new Set(["finance_review:under_review", "final_review:pending_center_delivery", "finance_review:submitted", "final_review:pending_fees", "finance_review:rejected", "final_review:rejected"]),
  LEGAL_DIRECTOR: new Set(["under_review:pending_final_approval", "under_review:suspended", "under_review:rejected"]),
  STUDIES_ASSESSOR: new Set(["under_review:under_review", "under_review:suspended", "under_review:rejected"]),
  STUDIES_HEAD: new Set(["under_review:under_review", "under_review:suspended", "under_review:rejected"]),
  DEPUTY_MINISTER: new Set(["pending_final_approval:pending_fees", "pending_final_approval:suspended", "pending_final_approval:rejected"]),
  // Scoped to their own center by a DB lookup in the route handler (this graph
  // only knows roles and statuses, not which center a submission or officer
  // belongs to) — see PATCH /api/admin/copyright-submissions/[id].
  CULTURAL_CENTER_OFFICER: new Set(["pending_center_delivery:completed"]),
};

const COPYRIGHT_STATUS_GRAPH = {
  submitted: new Set(["finance_review"]),
  finance_review: new Set(["under_review", "submitted", "rejected"]),
  under_review: new Set(["suspended", "rejected", "pending_final_approval"]),
  suspended: new Set(["under_review"]),
  pending_final_approval: new Set(["pending_fees", "suspended", "rejected"]),
  pending_fees: new Set(["final_review"]),
  final_review: new Set(["pending_center_delivery", "pending_fees", "rejected"]),
  pending_center_delivery: new Set(["completed"]),
};

const PUBLIC_COPYRIGHT_FIELDS = [
  "id", "referenceNo", "applicantName", "applicantRole", "workTitle", "workCategory",
  "workDesc", "province", "center", "completionDate", "idDocType",
  "hasTelecomDoc", "applicationStatus", "paymentStatus", "paymentGateway",
  "deficiencyNote", "createdAt", "updatedAt",
];

function parseDate(value, field) {
  const normalized = typeof value === "string"
    && value.includes("T")
    && !value.endsWith("Z")
    && !/[+-]\d{2}:\d{2}$/.test(value)
    ? `${value}Z`
    : value;
  const date = normalized instanceof Date ? normalized : new Date(normalized);
  if (!value || Number.isNaN(date.getTime())) throw new Error(`${field} is invalid`);
  return date;
}

export function assertValidEvent(data, now = new Date()) {
  if (!new Set(["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"]).has(data.status)) {
    throw new Error("status is invalid");
  }
  const start = parseDate(data.startDate, "startDate");
  const end = data.endDate ? parseDate(data.endDate, "endDate") : null;
  if (end && end < start) throw new Error("endDate cannot precede startDate");
  if (data.status === "COMPLETED" && start > now) {
    throw new Error("status COMPLETED is inconsistent with a future startDate");
  }
  if (data.status === "COMPLETED" && end && end > now) {
    throw new Error("status COMPLETED is inconsistent with a future endDate");
  }
  if (data.status === "UPCOMING" && start <= now) {
    throw new Error("status UPCOMING requires a future startDate");
  }
  if (data.status === "ONGOING" && (start > now || (end && end <= now))) {
    throw new Error("status ONGOING is inconsistent with event dates");
  }
  return { startDate: start, endDate: end };
}

export function canChangePostStatus(role, currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return true;
  return new Set(["SUPER_ADMIN", "ADMIN", "EDITOR", "MEDIA_OFFICE"]).has(role);
}

export function canTransitionCopyright(role, currentStatus, nextStatus) {
  if (new Set(["SUPER_ADMIN", "ADMIN"]).has(role)) {
    return currentStatus === nextStatus || (COPYRIGHT_STATUS_GRAPH[currentStatus]?.has(nextStatus) ?? false);
  }
  return COPYRIGHT_TRANSITIONS[role]?.has(`${currentStatus}:${nextStatus}`) ?? false;
}

// Admins may move an event submission to any status at any time. The next
// status only has to be a valid SubmissionStatus value.
const EVENT_SUBMISSION_STATUSES = new Set([
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "CONDITIONAL",
  "REJECTED",
]);

export function canTransitionEventSubmission(currentStatus, nextStatus) {
  return EVENT_SUBMISSION_STATUSES.has(nextStatus);
}

export function normalizeSustainable(value) {
  if (value === true || value === "yes" || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "no" || value === "false" || value === 0 || value === "0") return false;
  throw new Error("isSustainable must be yes or no");
}

export function validateEventSubmissionInput(data) {
  for (const field of ["applicantName", "eventName", "description"]) {
    if (typeof data[field] !== "string" || !data[field].trim()) {
      throw new Error(`${field} is required`);
    }
  }
  if (!data.phone?.trim() && !data.email?.trim()) {
    throw new Error("At least one contact method is required");
  }
  if (data.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    throw new Error("email is invalid");
  }
  if (data.phone?.trim() && !/^\+?\d{8,15}$/.test(data.phone.trim())) {
    throw new Error("phone is invalid");
  }
  if (data.entityType && !new Set(["DIRECTORATE", "GOVERNMENT", "EXTERNAL", "INDIVIDUAL"]).has(data.entityType)) {
    throw new Error("entityType is invalid");
  }
  if (data.proposedDate && Number.isNaN(new Date(data.proposedDate).getTime())) {
    throw new Error("proposedDate is invalid");
  }
  if (!Array.isArray(data.goals) || data.goals.filter((goal) => String(goal).trim()).length === 0) {
    throw new Error("goals must contain at least one item");
  }
  if (data.agreedToTerms !== true) throw new Error("agreedToTerms must be accepted");
  const isSustainable = normalizeSustainable(data.isSustainable);
  if (isSustainable && !data.sustainabilityNote?.trim()) {
    throw new Error("sustainabilityNote is required for sustainable events");
  }
  return { isSustainable };
}

export function toPublicCopyrightSubmission(submission) {
  const publicData = Object.fromEntries(
    PUBLIC_COPYRIGHT_FIELDS
      .filter((field) => submission[field] !== undefined)
      .map((field) => [field, submission[field]]),
  );
  publicData.authors = Array.isArray(submission.authors)
    ? submission.authors.filter((author) => typeof author?.name === "string").map(({ name }) => ({ name }))
    : [];
  return publicData;
}

function decodedBase64Size(base64) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function validateCopyrightWorkSource({ workFile, workDriveUrl }) {
  const hasFile = typeof workFile === "string" && workFile.length > 0;
  const hasUrl = typeof workDriveUrl === "string" && workDriveUrl.trim().length > 0;
  if (hasFile === hasUrl) throw new Error("Provide exactly one PDF or ZIP file, or a Google Drive URL");
  if (hasUrl) {
    let url;
    try { url = new URL(workDriveUrl); } catch { throw new Error("A valid Google Drive URL is required"); }
    if (url.protocol !== "https:" || url.hostname !== "drive.google.com") {
      throw new Error("Only a Google Drive URL is allowed");
    }
    return { workFile: null, workDriveUrl: url.toString() };
  }
  const match = workFile.match(/^data:(application\/(?:pdf|zip|x-zip-compressed));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new Error("The work file must be a Base64 PDF or ZIP file");
  if (decodedBase64Size(match[2]) > MAX_COPYRIGHT_WORK_BYTES) {
    throw new Error("The work file exceeds the 100 MiB limit; use Google Drive");
  }
  const signature = Buffer.from(match[2].slice(0, 12), "base64");
  const validSignature = match[1] === "application/pdf"
    ? signature.subarray(0, 5).toString("ascii") === "%PDF-"
    : signature[0] === 0x50 && signature[1] === 0x4b
    && [[0x03, 0x04], [0x05, 0x06], [0x07, 0x08]].some(([a, b]) => signature[2] === a && signature[3] === b);
  if (!validSignature) throw new Error(match[1] === "application/pdf" ? "The uploaded content is not a valid PDF file" : "The uploaded content is not a valid ZIP file");
  return { workFile, workDriveUrl: null };
}

export function validateUploadedDocument(value, field = "file", maxBytes = 10 * 1024 * 1024) {
  if (typeof value !== "string") throw new Error(`${field} must be an uploaded document`);
  const match = value.match(/^data:(application\/pdf|image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || decodedBase64Size(match[2]) <= 0 || decodedBase64Size(match[2]) > maxBytes) {
    throw new Error(`${field} has an invalid type or size`);
  }
  const bytes = Buffer.from(match[2].slice(0, 32), "base64");
  const valid = match[1] === "application/pdf"
    ? bytes.subarray(0, 4).toString("ascii") === "%PDF"
    : match[1] === "image/jpeg"
      ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : match[1] === "image/png"
        ? bytes[0] === 0x89 && bytes.subarray(1, 4).toString("ascii") === "PNG"
        : bytes.subarray(0, 4).toString("ascii") === "RIFF"
          && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (!valid) throw new Error(`${field} content does not match its declared type`);
  return value;
}
