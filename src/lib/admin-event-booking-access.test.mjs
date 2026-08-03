import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("directorate ownership accepts both DAL session and current-user shapes", async () => {
  const source = await readFile(new URL("./admin-event-booking-access.js", import.meta.url), "utf8");
  assert.match(source, /session\.userId\s*\?\?\s*session\.id/);
});
