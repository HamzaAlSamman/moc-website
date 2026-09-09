import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  ENGLISH_FIELDS,
  MISSING_ENGLISH_WHERE,
  englishChanged,
  eventTitleSearchWhere,
  hasCompleteEnglish,
  missingEnglishFields,
  pendingLanguageReviewWhere,
} from "./event-language-review.mjs";

const translated = {
  titleEn: "Antiquities Forum",
  descriptionEn: "<p>A cultural event.</p>",
  locationEn: "Cultural Center in Idlib",
};

test("a rich-text description that only contains markup counts as missing", () => {
  assert.deepEqual(missingEnglishFields({ ...translated, descriptionEn: "<p></p>" }), ["الوصف"]);
  assert.deepEqual(missingEnglishFields({ ...translated, descriptionEn: "<p><br></p>" }), ["الوصف"]);
  assert.deepEqual(missingEnglishFields({ ...translated, titleEn: "   " }), ["العنوان"]);
  assert.deepEqual(missingEnglishFields(translated), []);
  assert.equal(hasCompleteEnglish(translated), true);
});

test("every required English field is reported when an event has none", () => {
  assert.deepEqual(missingEnglishFields({}), ["العنوان", "الوصف", "الموقع"]);
});

// governorateEn comes from a fixed governorate map, so nobody proofreads it and
// a change to it must not invalidate a sign-off.
test("the proofread set is the three hand-written fields", () => {
  assert.deepEqual([...ENGLISH_FIELDS], ["titleEn", "descriptionEn", "locationEn"]);
  assert.equal(englishChanged(translated, { governorateEn: "Aleppo" }), false);
});

test("a sign-off survives a save that does not touch English", () => {
  // The common case: an editor fixes a date and resubmits the same English.
  assert.equal(englishChanged(translated, { ...translated }), false);
  assert.equal(englishChanged(translated, { titleAr: "عنوان جديد" }), false);
});

test("a sign-off is invalidated by any English edit", () => {
  assert.equal(englishChanged(translated, { titleEn: "Antiquities Forum!" }), true);
  assert.equal(englishChanged(translated, { descriptionEn: "<p>Rewritten.</p>" }), true);
  assert.equal(englishChanged(translated, { locationEn: "Aleppo Citadel" }), true);
  // Clearing a field is a change too — it must not keep vouching for text that
  // is no longer there.
  assert.equal(englishChanged(translated, { titleEn: null }), true);
});

test("the queue is upcoming, uncancelled and unreviewed", () => {
  const now = new Date("2026-09-08T00:00:00Z");
  const where = pendingLanguageReviewWhere(now);
  assert.equal(where.languageReviewedAt, null);
  assert.deepEqual(where.status, { not: "CANCELLED" });
  assert.deepEqual(where.OR, [
    { endDate: { gte: now } },
    { endDate: null, startDate: { gte: now } },
  ]);
});

// The tick and the auto-clear are two halves of one promise: a signed-off event
// shows text somebody read. Either half missing makes the tick a lie.
test("the event update route clears a sign-off when English changes", async () => {
  const route = await readFile(
    path.join(process.cwd(), "src", "app", "api", "admin", "events", "[id]", "route.js"),
    "utf8",
  );
  assert.match(route, /englishChanged\(existing, nextEnglish\)/);
  assert.match(route, /languageReviewedAt: null, languageReviewedById: null/);
  // The comparison needs the previous English, so it must be selected up front.
  assert.match(route, /titleEn: true, descriptionEn: true, locationEn: true, languageReviewedAt: true/);
});

test("the missing-English filter covers every proofread field, blank or null", () => {
  assert.deepEqual(MISSING_ENGLISH_WHERE.OR, [
    { titleEn: null }, { titleEn: "" },
    { descriptionEn: null }, { descriptionEn: "" },
    { locationEn: null }, { locationEn: "" },
  ]);
});

test("an empty search is no filter at all, not an empty match", () => {
  assert.equal(eventTitleSearchWhere(""), null);
  assert.equal(eventTitleSearchWhere("   "), null);
  assert.equal(eventTitleSearchWhere(undefined), null);
  const where = eventTitleSearchWhere("  مهرجان  ");
  assert.deepEqual(where.OR[0], { titleAr: { contains: "مهرجان", mode: "insensitive" } });
  assert.equal(where.OR.length, 3, "search covers Arabic title, English title and location");
});

// Both the tab filter and the search carry their own OR. Merging them into one
// object would drop a clause and silently widen the result set, so the pages
// combine them under AND.
test("list pages combine tab filters and search under AND", async () => {
  for (const parts of [["admin", "language-review", "page.js"], ["admin", "events", "page.js"]]) {
    const source = await readFile(path.join(process.cwd(), "src", "app", ...parts), "utf8");
    assert.match(source, /AND:/, `${parts.join("/")} must combine filters under AND`);
  }
});

test("the events list pages in the database rather than rendering everything", async () => {
  const source = await readFile(
    path.join(process.cwd(), "src", "app", "admin", "events", "page.js"),
    "utf8",
  );
  assert.match(source, /skip: \(page - 1\) \* PAGE_SIZE/);
  assert.match(source, /take: PAGE_SIZE/);
  // The count must use the same where as the rows, or the header lies.
  assert.match(source, /prisma\.event\.count\(\{ where \}\)/);
});

test("paging links carry the active filters", async () => {
  const source = await readFile(
    path.join(process.cwd(), "src", "components", "admin", "EventsPagination.jsx"),
    "utf8",
  );
  assert.match(source, /for \(const \[key, value\] of Object\.entries\(filters\)\)/);
  assert.match(source, /if \(lastPage <= 1\) return null/);
});

test("an untranslated event cannot be signed off", async () => {
  const route = await readFile(
    path.join(process.cwd(), "src", "app", "api", "admin", "events", "[id]", "language-review", "route.js"),
    "utf8",
  );
  assert.match(route, /REVIEW_EVENT_LANGUAGE/);
  assert.match(route, /ENGLISH_INCOMPLETE/);
  assert.match(route, /verifyTrustedOrigin/);
});
