import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("./route.js", import.meta.url), "utf8");

test("media upload route does not transcode images during the request", () => {
  assert.equal(source.includes('import("sharp")'), false);
  assert.equal(source.includes(".toBuffer()"), false);
});
