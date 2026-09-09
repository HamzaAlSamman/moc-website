import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Next proxy buffers the advertised copyright upload size", async () => {
  const config = await read("../../next.config.mjs");
  assert.match(config, /proxyClientMaxBodySize:\s*"170mb"/);
});

test("copyright routes reject oversized or malformed JSON without returning 500", async () => {
  const route = await read("../app/api/copyright/route.js");
  assert.match(route, /readCopyrightJson\(request\)/g);
  assert.match(route, /COPYRIGHT_REQUEST_TOO_LARGE/);
  assert.match(route, /status:\s*error\.status/);
});
