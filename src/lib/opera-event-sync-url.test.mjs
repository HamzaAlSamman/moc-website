import assert from "node:assert/strict";
import { test } from "node:test";
import { parseOperaEventPayload } from "./opera-event-sync.mjs";

const base = {
  externalId: "opera-event-1",
  titleAr: "حفل",
  startDate: "2026-08-20T18:00:00.000Z",
  status: "UPCOMING",
};

test("Opera event URLs are restricted to the deployed government domain", () => {
  assert.doesNotThrow(() => parseOperaEventPayload({
    ...base,
    featuredImage: "https://cdn.damasopera.gov.sy/poster.jpg",
    bookingUrl: "http://damasopera.gov.sy/events/show",
  }));
  assert.throws(() => parseOperaEventPayload({
    ...base,
    bookingUrl: "https://damascusopera.sy/events/show",
  }), /Invalid payload/);
  assert.throws(() => parseOperaEventPayload({
    ...base,
    bookingUrl: "https://evil.example/events/show",
  }), /Invalid payload/);
  assert.throws(() => parseOperaEventPayload({
    ...base,
    featuredImage: "https://evil.example/poster.jpg",
  }), /Invalid payload/);
});
