import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("shared event artwork renders portrait poster with blurred backdrop", async () => {
  const source = await readFile(new URL("../components/EventArtwork.jsx", import.meta.url), "utf8");

  assert.match(source, /aspect-\[4\/5\]/);
  assert.match(source, /object-contain/);
  assert.match(source, /object-cover/);
  assert.match(source, /blur/);
  assert.match(source, /aria-hidden="true"/);
  assert.match(source, /ImageWithFallback/);
});

test("image fallback forwards preload and eagerly loads its raw fallback", async () => {
  const source = await readFile(new URL("../components/ImageWithFallback.jsx", import.meta.url), "utf8");

  assert.match(source, /preload\s*=\s*false/);
  assert.match(source, /preload=\{preload\}/);
  assert.match(source, /loading=\{preload\s*\|\|\s*priority\s*\?\s*"eager"\s*:\s*"lazy"\}/);
});
