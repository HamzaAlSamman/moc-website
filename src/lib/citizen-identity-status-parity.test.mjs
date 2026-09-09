import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

// The UI hardcodes CitizenIdentityStatus values in several places: label maps,
// filter dropdowns, `status === "VERIFIED"` checks. Prisma does not tolerate a
// value outside the enum — it throws a validation error rather than returning
// an empty result — so a single stale key turns the admin verification queue
// into a 500 that the client renders as an empty list.
//
// This is not hypothetical: the whole citizen area shipped with UNSUBMITTED
// where the schema says NOT_SUBMITTED, which broke the "لم تُرفع" filter and
// blanked the status badge for every citizen who had not uploaded documents.

const SCHEMA = path.join(process.cwd(), "prisma", "schema.prisma");
const SRC = path.join(process.cwd(), "src");

function schemaEnumValues(name) {
  const source = readFileSync(SCHEMA, "utf8");
  const block = new RegExp(`enum\\s+${name}\\s*\\{([^}]*)\\}`).exec(source);
  assert.ok(block, `enum ${name} not found in schema.prisma`);
  return new Set(
    block[1]
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, "").trim())
      .filter(Boolean),
  );
}

function sourceFiles(dir = SRC) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(js|jsx|mjs)$/.test(entry.name) && !entry.name.includes(".test.") ? [full] : [];
  });
}

test("every identity status the UI hardcodes exists in the Prisma enum", () => {
  const valid = schemaEnumValues("CitizenIdentityStatus");
  assert.ok(valid.has("NOT_SUBMITTED") && valid.has("VERIFIED"), "unexpected enum shape");

  // Any of the four real values appearing as a bare string literal means the
  // file is talking about identity status, so every sibling SCREAMING_CASE
  // literal in that file is a candidate for the same vocabulary.
  const files = sourceFiles();
  assert.ok(files.length > 100, "expected to find the source tree");

  const offenders = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    if (!/["'](?:NOT_SUBMITTED|PENDING|VERIFIED|REJECTED)["']/.test(source)) continue;
    if (!/identityStatus|IDENTITY_|identity/i.test(source)) continue;

    // Catch the specific failure mode: a status-shaped literal that is not a
    // member of the enum, sitting in a file that clearly speaks identity.
    for (const match of source.matchAll(/["'](UN|NOT_)?SUBMITTED["']/g)) {
      const literal = match[0].slice(1, -1);
      if (!valid.has(literal)) offenders.push(`${path.relative(SRC, file)}: "${literal}"`);
    }
  }

  assert.deepEqual(offenders, [], `stale identity status literals (enum is ${[...valid].join(", ")})`);
});

test("the admin filter dropdown offers exactly the enum values", () => {
  const dashboard = readFileSync(
    path.join(SRC, "components", "admin", "CitizenReviewDashboard.jsx"),
    "utf8",
  );
  const labelMap = /const statusLabel = \{([^}]*)\}/.exec(dashboard);
  assert.ok(labelMap, "statusLabel map not found — did the dashboard change shape?");

  const keys = [...labelMap[1].matchAll(/([A-Z_]+):/g)].map((match) => match[1]);
  assert.deepEqual(
    new Set(keys),
    schemaEnumValues("CitizenIdentityStatus"),
    "the status filter must offer every enum value and nothing else — options are sent straight to Prisma",
  );
});
