import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("citizen identity submit route is session-bound, origin-checked, and requires both files", async () => {
  const source = await readFile(
    path.join(process.cwd(), "src", "app", "api", "citizen", "identity", "submit", "route.js"),
    "utf8",
  );
  assert.match(source, /getCitizenSession/);
  assert.match(source, /requireCitizenAuthOrigin/);
  assert.match(source, /form\.get\("front"\)/);
  assert.match(source, /form\.get\("back"\)/);
  assert.match(source, /2\s*\*\s*CITIZEN_IDENTITY_MAX_FILE_BYTES/);
  assert.match(source, /Cache-Control.*no-store/);
  assert.match(source, /force-dynamic/);
});
