import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

// Source-shape checks in the style of check-in-undo.test.mjs. Deleting a
// citizen account is the only irreversible action in the citizen area, so what
// these defend is who may do it, what it refuses to do, and that it leaves a
// trace the account itself can no longer provide.

const repo = (...parts) => path.join(process.cwd(), ...parts);
const routeFile = repo("src", "app", "api", "admin", "citizens", "[id]", "route.js");

test("permanent deletion sits a tier above blocking", async () => {
  const permissions = await readFile(repo("src", "lib", "permissions.js"), "utf8");
  // SUPER_ADMIN only - an ADMIN may block an account but not erase one.
  assert.match(permissions, /DELETE_CITIZEN_ACCOUNTS: \[ROLES\.SUPER_ADMIN\],/);
  assert.match(permissions, /MANAGE_CITIZEN_ACCOUNTS: \[ROLES\.SUPER_ADMIN, ROLES\.ADMIN\],/);
});

test("the delete route is permission-gated, origin-checked and confirmation-gated", async () => {
  const source = await readFile(routeFile, "utf8");
  const del = source.slice(source.indexOf("export async function DELETE"));
  assert.notEqual(del, "");
  assert.match(del, /can\(session\.role, "DELETE_CITIZEN_ACCOUNTS"\)/);
  assert.match(del, /verifyTrustedOrigin/);
  // Re-checked server-side: the browser dialog can be skipped entirely.
  assert.match(del, /confirmEmail !== target\.email\.toLowerCase\(\)/);
  assert.match(del, /CONFIRM_EMAIL_MISMATCH/);
});

test("an account holding a live ticket cannot be erased", async () => {
  const source = await readFile(routeFile, "utf8");
  const del = source.slice(source.indexOf("export async function DELETE"));
  assert.match(del, /CITIZEN_HAS_UPCOMING_BOOKINGS/);
  assert.match(del, /status: \{ in: \["CONFIRMED", "WAITLISTED"\] \}/);
  // Cancelled events do not hold an account hostage.
  assert.match(del, /status: \{ not: "CANCELLED" \}/);
  // The count and the delete share one transaction, so a booking made in
  // between cannot outlive the account as an orphan row with a valid ticket.
  const tx = del.slice(del.indexOf("$transaction"), del.indexOf("citizen.delete"));
  assert.match(tx, /tx\.eventBooking\.count/);
});

test("the erasure is audited and takes the identity photos with it", async () => {
  const source = await readFile(routeFile, "utf8");
  const del = source.slice(source.indexOf("export async function DELETE"));
  const tx = del.slice(del.indexOf("$transaction"));
  // Audit row written inside the same transaction as the delete: no deletion
  // without a record, no record without a deletion.
  assert.ok(tx.indexOf("CITIZEN_ACCOUNT_DELETED") < tx.indexOf("tx.citizen.delete"));
  assert.match(del, /nationalIdLast4: target\.nationalIdLast4/);
  // The hashed national ID never lands in the audit metadata.
  assert.doesNotMatch(del, /nationalIdHash/);
  // Files go after the commit - a rolled-back delete must not leave the
  // photos already gone.
  assert.ok(del.indexOf("removeCitizenIdentityPrivateFile") > del.indexOf("tx.citizen.delete"));
});

test("only a role that may delete is offered the button", async () => {
  const dashboard = await readFile(repo("src", "components", "admin", "CitizenReviewDashboard.jsx"), "utf8");
  assert.match(dashboard, /canDelete = false/);
  assert.match(dashboard, /\{canDelete && <CitizenDeleteButton citizen=\{citizen\}/);
  for (const page of ["page.js", path.join("verifications", "page.js")]) {
    const source = await readFile(repo("src", "app", "admin", "citizens", page), "utf8");
    assert.match(source, /canDelete=\{can\(user\.role, "DELETE_CITIZEN_ACCOUNTS"\)\}/, page);
  }
  // The profile page gates the same button on the same permission.
  const profile = await readFile(repo("src", "app", "admin", "citizens", "[id]", "page.js"), "utf8");
  assert.match(profile, /can\(user\.role, "DELETE_CITIZEN_ACCOUNTS"\) && \(/);
  assert.match(profile, /<CitizenDeleteButton/);
  assert.match(profile, /redirectTo="\/admin\/citizens"/);
});

test("both screens share one confirmation flow", async () => {
  const button = await readFile(repo("src", "components", "admin", "CitizenDeleteButton.jsx"), "utf8");
  assert.match(button, /method: "DELETE"/);
  assert.match(button, /confirmEmail: typed/);
  // One copy of the warning wording, so the two entry points cannot drift.
  for (const file of ["CitizenReviewDashboard.jsx"]) {
    const source = await readFile(repo("src", "components", "admin", file), "utf8");
    assert.doesNotMatch(source, /method: "DELETE"/, file);
    assert.doesNotMatch(source, /window\.confirm\(`حذف نهائي/, file);
  }
});
