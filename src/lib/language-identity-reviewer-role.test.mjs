import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { PERMISSIONS, ROLES, ROLE_LABELS, can } from "./permissions.js";

// LANGUAGE_IDENTITY_REVIEWER proofreads the English side of cultural-calendar
// events and rules on citizen identity submissions. Its whole point is what it
// CANNOT do, so the denied list below is the part worth defending: a later edit
// that widens one of these permissions is a privilege escalation, not a tweak.
const ROLE = ROLES.LANGUAGE_IDENTITY_REVIEWER;

const GRANTED = [
  "VIEW_DASHBOARD",
  "VIEW_EVENTS",
  "VIEW_ANY_EVENT",
  "EDIT_EVENT",
  "EDIT_ANY_EVENT",
  "REVIEW_EVENT_LANGUAGE", // signs off that an event's English was proofread
  "UPLOAD_MEDIA", // the event form uploads the featured image through it
  "REVIEW_CITIZEN_IDENTITY",
  "VIEW_CITIZEN_IDENTITY_FILES",
];

const DENIED = [
  "CREATE_EVENT",
  "PUBLISH_EVENT",
  "REVIEW_EVENT",
  "DELETE_ANY_EVENT",
  "DELETE_OWN_EVENT",
  "MANAGE_EVENT_TAXONOMIES",
  "VIEW_EVENT_BOOKINGS",
  "MANAGE_EVENT_BOOKINGS",
  "SCAN_EVENT_TICKETS",
  // Deciding on an ID is not the same authority as blocking or erasing the
  // account that submitted it.
  "MANAGE_CITIZEN_ACCOUNTS",
  "DELETE_CITIZEN_ACCOUNTS",
  "CREATE_POST",
  "VIEW_USERS",
  "CREATE_USER",
  "CHANGE_ROLE",
  "VIEW_SUBMISSIONS",
  "VIEW_LEGAL_LICENSES",
  "VIEW_AUDIT_LOG",
  "VIEW_SETTINGS",
];

test("the role holds exactly its two jobs", () => {
  for (const permission of GRANTED) {
    assert.ok(can(ROLE, permission), `expected ${ROLE} to hold ${permission}`);
  }
  for (const permission of DENIED) {
    assert.ok(!can(ROLE, permission), `${ROLE} must NOT hold ${permission}`);
  }
});

test("every permission is either granted or explicitly denied", () => {
  // Keeps this test honest as PERMISSIONS grows: a new permission handed to
  // this role has to be listed above before it can pass.
  const accounted = new Set([...GRANTED, ...DENIED]);
  const unlisted = Object.keys(PERMISSIONS).filter(
    (permission) => can(ROLE, permission) && !accounted.has(permission),
  );
  assert.deepEqual(unlisted, []);
});

test("the role is labelled in both languages", () => {
  assert.equal(ROLE_LABELS.ar[ROLE], "مدقق لغوي وهويات");
  assert.ok(ROLE_LABELS.en[ROLE]);
});

// The events screen used to be gated on CREATE_EVENT, which conflated "may open
// the calendar" with "may add to it". VIEW_EVENTS split them — so every role
// that could reach the screen before must still reach it.
test("VIEW_EVENTS covers everyone who can create an event", () => {
  for (const role of PERMISSIONS.CREATE_EVENT) {
    assert.ok(can(role, "VIEW_EVENTS"), `${role} lost access to the events screen`);
  }
});

test("the events screen and its sidebar link agree on VIEW_EVENTS", async () => {
  const repo = (...parts) => path.join(process.cwd(), ...parts);
  const page = await readFile(repo("src", "app", "admin", "events", "page.js"), "utf8");
  const sidebar = await readFile(repo("src", "components", "admin", "AdminSidebar.jsx"), "utf8");
  assert.match(page, /can\(user\.role, "VIEW_EVENTS"\)/);
  assert.match(sidebar, /href: "\/admin\/events".*permission: "VIEW_EVENTS"/);
});

// Role is a PostgreSQL enum: without the migration the value exists in the
// client but every login as this role fails at the database.
test("the role exists in the schema and ships a migration", async () => {
  const schema = await readFile(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");
  assert.match(schema, /^\s*LANGUAGE_IDENTITY_REVIEWER\s*$/m);

  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const dirs = await readdir(migrationsDir, { withFileTypes: true });
  const sql = await Promise.all(
    dirs
      .filter((entry) => entry.isDirectory())
      .map((entry) => readFile(path.join(migrationsDir, entry.name, "migration.sql"), "utf8")),
  );
  assert.ok(
    sql.some((body) => body.includes("ADD VALUE IF NOT EXISTS 'LANGUAGE_IDENTITY_REVIEWER'")),
    "no migration adds LANGUAGE_IDENTITY_REVIEWER to the Role enum",
  );
});

test("the role is assignable from the user form", async () => {
  const form = await readFile(
    path.join(process.cwd(), "src", "components", "admin", "UserForm.jsx"),
    "utf8",
  );
  assert.match(form, /"LANGUAGE_IDENTITY_REVIEWER"/);
});

// The reviewer's dashboard shows two different numbers that are easy to
// conflate: events with no English at all, and upcoming events nobody has
// signed off yet. Each must be counted and listed from one filter, or the card
// and the panel beneath it will disagree with no way to tell which is lying.
test("the dashboard counts and lists from one filter per queue", async () => {
  const dashboard = await readFile(
    path.join(process.cwd(), "src", "app", "admin", "dashboard", "page.js"),
    "utf8",
  );
  // Both filters come from the shared module rather than being redeclared per
  // page — the dashboard, the review board and the events list all read the
  // same definitions.
  assert.doesNotMatch(dashboard, /const MISSING_ENGLISH_WHERE = \{/);
  assert.match(dashboard, /prisma\.event\.count\(\{ where: MISSING_ENGLISH_WHERE \}\)/);

  // The review queue's count and its list share pendingLanguageReviewWhere(),
  // which lives in the shared module the sign-off route also reads.
  assert.match(dashboard, /prisma\.event\.findMany\(\{\s*where: pendingLanguageReviewWhere\(\),/);
  assert.match(dashboard, /prisma\.event\.count\(\{ where: pendingLanguageReviewWhere\(\) \}\)/);
  assert.match(dashboard, /from "@\/lib\/event-language-review\.mjs"/);

  // Silent directorates are derived from the same list the section renders, so
  // the stat card and the table can never report different totals.
  assert.match(dashboard, /silentDirectorates = directorateActivity\.filter/);
});

// Event.createdById holds a user id. Seeding an email there produces an event
// that no creator lookup can ever resolve — which is exactly what the
// directorate-activity panel reads.
test("the mock seed attributes events to a real user id", async () => {
  const seed = await readFile(path.join(process.cwd(), "prisma", "seed-mock.js"), "utf8");
  assert.doesNotMatch(seed, /createdById:\s*"[^"]*@/);
  assert.match(seed, /createdById: staffUserIds\[/);
});

// The block button calls an endpoint this role is refused by, so it must be
// hidden from it rather than fail on click.
test("blocking an account is gated in the citizen dashboard", async () => {
  const dashboard = await readFile(
    path.join(process.cwd(), "src", "components", "admin", "CitizenReviewDashboard.jsx"),
    "utf8",
  );
  assert.match(dashboard, /canBlock && <button onClick=\{\(\) => toggleBlock\(citizen\)\}/);
});
