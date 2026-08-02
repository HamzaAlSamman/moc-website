import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isOperaBearerAuthorized,
  parseOperaEventPayload,
  parseOperaExternalId,
} from "./opera-event-sync.mjs";

const validPayload = {
  externalId: "opera-event-1",
  titleAr: "<b>حفل افتتاح</b><script>alert(1)</script>",
  titleEn: "<b>Opening concert</b>",
  descriptionAr: "<p>وصف آمن</p><script>alert(1)</script>",
  descriptionEn: null,
  location: "<b>دار الأوبرا</b>",
  startDate: "2026-08-20T18:00:00.000Z",
  endDate: null,
  featuredImage: "http://damasopera.gov.sy/photo/poster.jpg",
  bookingUrl: "http://damasopera.gov.sy/events/opening-concert",
  status: "LIMITED",
};

test("Opera bearer authorization accepts only an exact configured secret", () => {
  assert.equal(isOperaBearerAuthorized("Bearer shared-secret", "shared-secret"), true);
  assert.equal(isOperaBearerAuthorized("bearer shared-secret", "shared-secret"), true);
  assert.equal(isOperaBearerAuthorized("Bearer wrong-secret", "shared-secret"), false);
  assert.equal(isOperaBearerAuthorized("Bearer shared-secret-extra", "shared-secret"), false);
  assert.equal(isOperaBearerAuthorized(null, "shared-secret"), false);
  assert.equal(isOperaBearerAuthorized("Bearer shared-secret", ""), false);
});

test("Opera event payload is validated, sanitized and mapped for Prisma", () => {
  const parsed = parseOperaEventPayload(validPayload, new Date("2026-07-19T09:00:00.000Z"));
  assert.equal(parsed.externalId, "opera-event-1");
  assert.equal(parsed.create.source, "OPERA");
  assert.equal(parsed.create.reviewStatus, "APPROVED");
  assert.equal(parsed.update.titleAr, "حفل افتتاح");
  assert.equal(parsed.update.titleEn, "Opening concert");
  assert.equal(parsed.update.location, "دار الأوبرا");
  assert.equal(parsed.update.descriptionAr, "<p>وصف آمن</p>");
  assert.equal(parsed.update.status, "UPCOMING");
  assert.equal(parsed.update.startDate.toISOString(), "2026-08-20T18:00:00.000Z");
  assert.equal(parsed.update.endDate, null);
  assert.equal(parsed.update.syncedAt.toISOString(), "2026-07-19T09:00:00.000Z");
});

test("Opera event payload rejects unknown fields, statuses and invalid date ranges", () => {
  assert.throws(() => parseOperaEventPayload({ ...validPayload, unexpected: true }), /Invalid payload/);
  assert.throws(() => parseOperaEventPayload({ ...validPayload, status: "UNKNOWN" }), /Invalid payload/);
  assert.throws(() => parseOperaEventPayload({ ...validPayload, startDate: "not-a-date" }), /Invalid startDate/);
  assert.throws(() => parseOperaEventPayload({ ...validPayload, endDate: "not-a-date" }), /Invalid endDate/);
  assert.throws(
    () => parseOperaEventPayload({ ...validPayload, endDate: "2026-08-19T18:00:00.000Z" }),
    /endDate must be on or after startDate/,
  );
});

test("Opera delete external id must be a bounded non-empty identifier", () => {
  assert.equal(parseOperaExternalId(" opera-event-1 "), "opera-event-1");
  assert.throws(() => parseOperaExternalId(""), /externalId is required/);
  assert.throws(() => parseOperaExternalId("x".repeat(257)), /externalId is invalid/);
});
