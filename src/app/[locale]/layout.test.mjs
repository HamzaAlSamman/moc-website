import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("./layout.js", import.meta.url), "utf8");

test("handled settings database fallback does not surface as a console error", () => {
  assert.equal(source.includes("console.error(\"Warning: Failed to fetch database settings from Prisma:\""), false);
});
