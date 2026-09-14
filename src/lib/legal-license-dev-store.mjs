import { createHash, randomUUID } from "node:crypto";

const STORE_KEY = Symbol.for("moc.legalLicenseDevStore");

function store() {
  if (!globalThis[STORE_KEY]) globalThis[STORE_KEY] = { applications: new Map(), files: new Map(), sequence: 0 };
  return globalThis[STORE_KEY];
}

function tokenHash(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

export function legalLicenseDevStoreEnabled() {
  return process.env.NODE_ENV === "development" && !process.env.DATABASE_URL;
}

export function createDevLegalLicense(draft, accessToken) {
  const state = store();
  const now = new Date();
  const id = randomUUID();
  const referenceNo = `LIC-${now.getFullYear()}-${String(++state.sequence).padStart(4, "0")}`;
  const application = {
    ...draft,
    id,
    referenceNo,
    accessTokenHash: tokenHash(accessToken),
    status: "DRAFT",
    revision: 1,
    founders: (draft.founders || []).map((founder) => ({ ...founder, id: randomUUID(), createdAt: now, updatedAt: now })),
    attachments: [],
    history: [{ id: randomUUID(), action: "DRAFT_CREATED", toStatus: "DRAFT", publicNote: "Draft created", createdAt: now }],
    reviewItems: [],
    createdAt: now,
    updatedAt: now,
  };
  state.applications.set(id, application);
  return application;
}

export function findDevLegalLicense(token, { id, referenceNo } = {}) {
  const wantedHash = tokenHash(token);
  return [...store().applications.values()].find((application) => (
    application.accessTokenHash === wantedHash
    && (!id || application.id === id)
    && (!referenceNo || application.referenceNo === referenceNo)
  )) || null;
}

export function updateDevLegalLicense(current, draft) {
  const now = new Date();
  const previousFounders = new Map((current.founders || []).map((founder) => [founder.id, founder]));
  const founders = (draft.founders || []).map((founder) => {
    const previous = founder.id ? previousFounders.get(founder.id) : null;
    return { ...founder, id: previous?.id || randomUUID(), createdAt: previous?.createdAt || now, updatedAt: now };
  });
  const updated = { ...current, ...draft, founders, revision: current.revision + 1, updatedAt: now };
  store().applications.set(current.id, updated);
  return updated;
}

export function addDevLegalLicenseAttachment(application, { founderId, kind, file, bytes, mimeType }) {
  const state = store();
  const now = new Date();
  const version = Math.max(0, ...application.attachments
    .filter((item) => item.kind === kind && (item.founderId || null) === (founderId || null))
    .map((item) => item.version)) + 1;
  const attachment = {
    id: randomUUID(), founderId: founderId || null, kind,
    originalName: String(file.name || "document").slice(0, 255),
    mimeType, size: bytes.length, version, createdAt: now,
  };
  state.files.set(attachment.id, bytes);
  const updated = {
    ...application,
    attachments: [attachment, ...application.attachments],
    revision: application.revision + 1,
    updatedAt: now,
  };
  state.applications.set(application.id, updated);
  return { attachment, revision: updated.revision, updatedAt: updated.updatedAt };
}

export function readDevLegalLicenseAttachment(attachmentId) {
  const bytes = store().files.get(attachmentId);
  return bytes ? Buffer.from(bytes) : null;
}
