import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { ministryHexTile, ministryHexTileDataUri } from "./ministry-hex-tile.mjs";

const repo = (...parts) => path.join(process.cwd(), ...parts);

test("the tile stays small enough to travel inside a document", () => {
  // The whole reason this module exists. Chromium rasterizes a repeating
  // background into a PDF, so a heavy tile is paid for on every page — and
  // the ticket is now attached to every booking confirmation email.
  assert.ok(ministryHexTile().length < 1024, `tile is ${ministryHexTile().length} bytes`);
  assert.ok(ministryHexTileDataUri().length < 2048);
});

test("colour and opacity are parameterised for light and dark backgrounds", () => {
  assert.match(ministryHexTile(), /fill='#002723' fill-opacity='0\.05'/);
  assert.match(ministryHexTile({ color: "#ffffff", opacity: 1 }), /fill='#ffffff' fill-opacity='1'/);
});

test("nothing that travels embeds the full-page hex artwork", async () => {
  // public/svg/pattern-hex.svg is 136 KB — fine as a cached page background,
  // 76% of a ticket PDF when tiled into one.
  for (const file of [repo("src", "lib", "booking-ticket-pdf.js"), repo("src", "lib", "mailer.js")]) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /dataUri\(\s*["']svg\/pattern-hex\.svg/, file);
    assert.match(source, /ministryHexTileDataUri/, file);
  }
});

test("the ticket header repeats the tile at its own size", async () => {
  const pdf = await readFile(repo("src", "lib", "booking-ticket-pdf.js"), "utf8");
  // The old rule scaled a full-page artwork to 220px; a 28×49 seamless tile
  // stretched that far stops reading as the ministry's hexagons at all.
  assert.match(pdf, /background-size:28px 49px/);
  assert.doesNotMatch(pdf, /background-size:220px/);
});
