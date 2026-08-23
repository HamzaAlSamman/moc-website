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

test("calendar event images use the shared portrait artwork", async () => {
  const source = await readFile(new URL("../components/CulturalCalendarSection.jsx", import.meta.url), "utf8");

  assert.match(source, /import\s+EventArtwork\s+from\s+["']\.\/EventArtwork["']/);
  assert.ok((source.match(/<EventArtwork\b/g) ?? []).length >= 2);
  assert.doesNotMatch(source, /aspect-\[16\/9\]/);
  assert.match(source, /lg:grid-cols-\[minmax\(0,380px\)_1fr\]/);
});
