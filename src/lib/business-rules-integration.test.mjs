import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("public copyright API redacts records and uses atomic citizen transitions", async () => {
  const source = await read("../app/api/copyright/route.js");
  assert.match(source, /toPublicCopyrightSubmission\(submission\)/);
  assert.match(source, /copyrightSubmission\.updateMany/);
  assert.match(source, /validateCopyrightWorkSource/);
  assert.match(source, /validateCopyrightDocuments/);
});

test("staff copyright workflow checks role and current row version", async () => {
  const source = await read("../app/api/admin/copyright-submissions/[id]/route.js");
  assert.match(source, /canTransitionCopyright/);
  assert.match(source, /applicationStatus: existing\.applicationStatus, updatedAt: existing\.updatedAt/);
});

test("event submissions are deduplicated transactionally and soft deleted", async () => {
  const publicRoute = await read("../app/api/event-submissions/route.js");
  const adminRoute = await read("../app/api/admin/event-submissions/[id]/route.js");
  assert.match(publicRoute, /isolationLevel: "Serializable"/);
  assert.match(publicRoute, /15 \* 60 \* 1000/);
  assert.match(adminRoute, /deletedAt: new Date\(\)/);
  assert.doesNotMatch(adminRoute, /eventSubmission\.delete\(/);
});

test("session authorization refreshes active role from the database", async () => {
  const source = await read("./dal.js");
  assert.match(source, /prisma\.user\.findUnique/);
  assert.match(source, /if \(!user\?\.isActive\)/);
  assert.match(source, /role: user\.role/);
});

test("directorate cannot manage event taxonomies", async () => {
  const source = await read("./permissions.js");
  const permission = source.match(/MANAGE_EVENT_TAXONOMIES:\s*\[([^\]]+)\]/)?.[1] ?? "";
  assert.doesNotMatch(permission, /DIRECTORATE/);
});
