import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const api = (...parts) => path.join(process.cwd(), "src", "app", "api", "admin", ...parts, "route.js");

test("booking and citizen permissions match the approved role matrix and exclude EDITOR", async () => {
  const source = await readFile(path.join(process.cwd(), "src", "lib", "permissions.js"), "utf8");
  assert.match(source, /VIEW_EVENT_BOOKINGS:\s*\[ROLES\.SUPER_ADMIN, ROLES\.ADMIN, ROLES\.EVENT_MANAGER, ROLES\.DIRECTORATE\]/);
  assert.match(source, /MANAGE_EVENT_BOOKINGS:\s*\[ROLES\.SUPER_ADMIN, ROLES\.ADMIN, ROLES\.EVENT_MANAGER, ROLES\.DIRECTORATE\]/);
  assert.match(source, /EXPORT_EVENT_BOOKINGS:\s*\[ROLES\.SUPER_ADMIN, ROLES\.ADMIN, ROLES\.EVENT_MANAGER\]/);
  assert.match(source, /REVIEW_CITIZEN_IDENTITY:\s*\[ROLES\.SUPER_ADMIN, ROLES\.ADMIN\]/);
  assert.match(source, /VIEW_CITIZEN_IDENTITY_FILES:\s*\[ROLES\.SUPER_ADMIN, ROLES\.ADMIN\]/);
});

test("identity administration includes list/detail, atomic review, protected file download, and audit", async () => {
  const files = [
    api("citizens"),
    api("citizens", "[id]"),
    api("citizens", "[id]", "identity", "review"),
    api("citizens", "[id]", "identity", "[side]"),
  ];
  const sources = await Promise.all(files.map((file) => readFile(file, "utf8")));
  assert.match(sources[2], /citizenIdentityReviewService/);
  assert.match(sources[2], /REVIEW_CITIZEN_IDENTITY/);
  assert.match(sources[3], /VIEW_CITIZEN_IDENTITY_FILES/);
  assert.match(sources[3], /readCitizenIdentityPrivateFile/);
  assert.match(sources[3], /auditLog\.create/);
  assert.match(sources[3], /Cache-Control.*no-store/);
});

test("event booking administration covers settings, closure, listing, manual booking, check-in, and audited export", async () => {
  const settings = await readFile(api("events", "[id]", "booking-settings"), "utf8");
  const bookings = await readFile(api("events", "[id]", "bookings"), "utf8");
  const checkIn = await readFile(api("bookings", "[id]", "check-in"), "utf8");
  const csv = await readFile(api("events", "[id]", "bookings", "export"), "utf8");
  assert.match(settings, /syncCapacity/);
  assert.match(settings, /bookingAvailability/);
  assert.match(settings, /MANAGE_EVENT_BOOKINGS/);
  assert.match(bookings, /VIEW_EVENT_BOOKINGS/);
  assert.match(bookings, /source:\s*"ADMIN"/);
  assert.match(bookings, /manualReason/);
  assert.match(bookings, /normalizeNationalId/);
  assert.match(checkIn, /checkInBooking/);
  assert.match(csv, /EXPORT_EVENT_BOOKINGS/);
  assert.match(csv, /auditLog\.create/);
  assert.doesNotMatch(csv, /identityFront|identityBack/);
});
