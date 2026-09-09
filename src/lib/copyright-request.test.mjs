import assert from "node:assert/strict";
import test from "node:test";
import { readCopyrightJson } from "./copyright-request.mjs";

test("JSON reader rejects chunked/undeclared body above its actual byte cap", async () => {
  const request = new Request("http://localhost/", { method: "POST", body: JSON.stringify({ name: "x".repeat(40) }) });
  await assert.rejects(readCopyrightJson(request, { maxBytes: 32 }), { status: 413 });
});
test("JSON reader rejects understated length and counts UTF-8 bytes", async () => {
  const request = new Request("http://localhost/", { method: "POST", headers: { "content-length": "1" }, body: JSON.stringify({ name: "س".repeat(20) }) });
  await assert.rejects(readCopyrightJson(request, { maxBytes: 32 }), { status: 413 });
});
test("JSON reader handles split UTF-8 characters and exact size boundary", async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({ name: "سورية" }));
  const body = new ReadableStream({ start(c) { for (const byte of bytes) c.enqueue(Uint8Array.of(byte)); c.close(); } });
  const request = new Request("http://localhost/", { method: "POST", body, duplex: "half" });
  assert.deepEqual(await readCopyrightJson(request, { maxBytes: bytes.length }), { name: "سورية" });
});
