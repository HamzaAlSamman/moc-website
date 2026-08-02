import assert from "node:assert/strict";
import { test } from "node:test";
import nextConfig from "../../next.config.mjs";
import { parseOperaEventPayload } from "./opera-event-sync.mjs";

const base = {
  externalId: "opera-event-1",
  titleAr: "حفل",
  startDate: "2026-08-20T18:00:00.000Z",
  status: "UPCOMING",
};

test("MOC accepts only the deployed Opera government domain", () => {
  assert.doesNotThrow(() => parseOperaEventPayload({
    ...base,
    featuredImage: "http://damasopera.gov.sy/photo/poster.jpg",
    bookingUrl: "http://damasopera.gov.sy/events/show",
  }));
  assert.throws(() => parseOperaEventPayload({
    ...base,
    bookingUrl: "https://damascusopera.sy/events/show",
  }), /Invalid payload/);
});

test("Next image configuration permits posters from the deployed Opera domain", () => {
  assert.equal(
    nextConfig.images.remotePatterns.some((pattern) =>
      pattern.protocol === "http" &&
      pattern.hostname === "damasopera.gov.sy" &&
      pattern.pathname === "/**"
    ),
    true,
  );
});
