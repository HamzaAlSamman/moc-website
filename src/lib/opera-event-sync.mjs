import crypto from "node:crypto";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { parseDateAsUTC } from "./dates.js";

const SOURCE = "OPERA";
const DEFAULT_GOVERNORATE = "دمشق";
const DEFAULT_GOVERNORATE_EN = "Damascus";
const OPERA_HOST = "damasopera.gov.sy";

const STATUS_MAP = {
  UPCOMING: "UPCOMING",
  LIMITED: "UPCOMING",
  SOLD_OUT: "UPCOMING",
  PAST: "COMPLETED",
  CLOSED: "CANCELLED",
};

const nullableText = (max) => z.string().trim().max(max).nullish();
const trustedOperaUrl = z.string().trim().url().max(2_048).refine((value) => {
  const url = new URL(value);
  const trustedProtocol = url.protocol === "http:" || url.protocol === "https:";
  const trustedHost = url.hostname === OPERA_HOST || url.hostname.endsWith("." + OPERA_HOST);
  return trustedProtocol && trustedHost;
}, "URL must use the deployed Damascus Opera government domain");

const eventSchema = z.object({
  externalId: z.string().trim().min(1).max(256),
  titleAr: z.string().trim().min(1).max(500),
  titleEn: nullableText(500),
  descriptionAr: nullableText(100_000),
  descriptionEn: nullableText(100_000),
  location: nullableText(500),
  locationEn: nullableText(500),
  startDate: z.string().trim().min(1).max(64),
  endDate: nullableText(64),
  featuredImage: trustedOperaUrl.nullish(),
  bookingUrl: trustedOperaUrl.nullish(),
  status: z.enum(Object.keys(STATUS_MAP)).default("UPCOMING"),
}).strict();

export class OperaSyncValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "OperaSyncValidationError";
    this.details = details;
  }
}

export function isOperaBearerAuthorized(header, secret) {
  if (!secret || typeof header !== "string") return false;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return false;
  const provided = Buffer.from(match[1], "utf8");
  const expected = Buffer.from(secret, "utf8");
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

function sanitizePlainText(value) {
  if (!value) return null;
  const sanitized = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
  return sanitized || null;
}

function sanitizeRichText(value) {
  if (!value) return null;
  const sanitized = sanitizeHtml(value, {
    allowedTags: [
      "p", "br", "strong", "em", "u", "s", "blockquote",
      "ul", "ol", "li", "a", "img", "h1", "h2", "h3", "h4", "h5", "h6",
      "span", "div",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      span: ["style"],
      div: ["style"],
      p: ["style"],
      "*": ["class"],
    },
    allowedStyles: {
      "*": { "text-align": [/^left$|^right$|^center$|^justify$/] },
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow" }),
    },
  }).trim();
  return sanitized || null;
}

export function parseOperaEventPayload(raw, now = new Date()) {
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) {
    throw new OperaSyncValidationError("Invalid payload", parsed.error.flatten());
  }

  const data = parsed.data;
  const startDate = parseDateAsUTC(data.startDate);
  const endDate = data.endDate ? parseDateAsUTC(data.endDate) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) {
    throw new OperaSyncValidationError("Invalid startDate");
  }
  if (endDate && Number.isNaN(endDate.getTime())) {
    throw new OperaSyncValidationError("Invalid endDate");
  }
  if (endDate && endDate < startDate) {
    throw new OperaSyncValidationError("endDate must be on or after startDate");
  }

  const titleAr = sanitizePlainText(data.titleAr);
  if (!titleAr) {
    throw new OperaSyncValidationError("Invalid payload", {
      fieldErrors: { titleAr: ["titleAr must contain visible text"] },
    });
  }

  const update = {
    titleAr,
    titleEn: sanitizePlainText(data.titleEn),
    descriptionAr: sanitizeRichText(data.descriptionAr),
    descriptionEn: sanitizeRichText(data.descriptionEn),
    location: sanitizePlainText(data.location),
    locationEn: sanitizePlainText(data.locationEn),
    governorate: DEFAULT_GOVERNORATE,
    governorateEn: DEFAULT_GOVERNORATE_EN,
    startDate,
    endDate,
    featuredImage: data.featuredImage || null,
    bookingUrl: data.bookingUrl || null,
    status: STATUS_MAP[data.status],
    syncedAt: now,
  };

  return {
    externalId: data.externalId,
    update,
    create: {
      ...update,
      source: SOURCE,
      externalId: data.externalId,
      reviewStatus: "APPROVED",
    },
  };
}

export function parseOperaExternalId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new OperaSyncValidationError("externalId is required");
  }
  const parsed = z.string().trim().min(1).max(256).safeParse(value);
  if (!parsed.success) {
    throw new OperaSyncValidationError("externalId is invalid", parsed.error.flatten());
  }
  return parsed.data;
}
