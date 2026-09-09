// English proofreading of cultural-calendar events, kept dependency-free so the
// dashboard, the sign-off route and the event-update route all decide "is this
// translated?" and "does this tick still hold?" from one place — the same split
// as citizen-route-access.mjs.

// The three English fields the public event page and the event form both treat
// as required. governorateEn is excluded on purpose: it is derived from a fixed
// governorate map, never typed by hand, so it is not something to proofread.
export const ENGLISH_FIELDS = Object.freeze(["titleEn", "descriptionEn", "locationEn"]);

const FIELD_LABELS_AR = Object.freeze({
  titleEn: "العنوان",
  descriptionEn: "الوصف",
  locationEn: "الموقع",
});

function isBlank(value) {
  // Rich-text descriptions arrive as HTML, so "<p></p>" and "<p><br></p>" are
  // empty even though the string is not.
  return !String(value ?? "").replace(/<[^>]*>/g, "").trim();
}

/** Arabic labels of the English fields this event is still missing. */
export function missingEnglishFields(event) {
  return ENGLISH_FIELDS.filter((field) => isBlank(event?.[field])).map((field) => FIELD_LABELS_AR[field]);
}

export function hasCompleteEnglish(event) {
  return missingEnglishFields(event).length === 0;
}

/**
 * True when an update changes any proofread English field, which is what
 * invalidates an existing sign-off. Compared field by field rather than by
 * "did the request include English?" — a save that resubmits identical text
 * (the common case when an editor fixes a date) must not clear the tick.
 */
export function englishChanged(before, after) {
  return ENGLISH_FIELDS.some((field) => {
    if (!(field in (after || {}))) return false;
    return String(before?.[field] ?? "") !== String(after?.[field] ?? "");
  });
}

/** Prisma `where` for the reviewer's queue: upcoming events not yet signed off. */
export function pendingLanguageReviewWhere(now = new Date()) {
  return {
    languageReviewedAt: null,
    status: { not: "CANCELLED" },
    OR: [{ endDate: { gte: now } }, { endDate: null, startDate: { gte: now } }],
  };
}

/**
 * Prisma `where` for events with no English at all — a content gap rather than
 * an unread translation. Kept next to the queue above so the two definitions of
 * "not ready in English" can never drift apart.
 */
export const MISSING_ENGLISH_WHERE = Object.freeze({
  OR: ENGLISH_FIELDS.flatMap((field) => [{ [field]: null }, { [field]: "" }]),
});

/** Case-insensitive title search used by the events list and the review board. */
export function eventTitleSearchWhere(term) {
  const q = String(term ?? "").trim();
  if (!q) return null;
  return {
    OR: [
      { titleAr: { contains: q, mode: "insensitive" } },
      { titleEn: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
    ],
  };
}
