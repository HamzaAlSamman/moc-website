import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

// Source-shape checks, in the same style as admin-booking-routes.test.mjs.
// What they defend is the property the ministry asked for: a ticket QR that a
// generic reader cannot act on, and a check-in that only an authorised officer
// can perform. Both are easy to undo by accident — one `QRCode.toDataURL(url)`
// puts a working link back on every ticket.

const repo = (...parts) => path.join(process.cwd(), ...parts);
const lib = (...parts) => repo("src", "lib", ...parts);
const api = (...parts) => repo("src", "app", "api", "admin", "tickets", ...parts, "route.js");

test("the ticket QR carries the encrypted payload, never a link", async () => {
  const pdf = await readFile(lib("booking-ticket-pdf.js"), "utf8");
  assert.match(pdf, /encodeTicketScanPayload/);
  assert.match(pdf, /QRCode\.toDataURL\(payload/);
  assert.doesNotMatch(
    pdf,
    /QRCode\.toDataURL\((verifyUrl|portalUrl|url)/,
    "a URL in the QR would make every phone camera a working reader again",
  );
});

test("nothing mints a prefilled verification link any more", async () => {
  const codes = await readFile(lib("booking-ticket-code.mjs"), "utf8");
  assert.match(codes, /export function bookingTicketPortalUrl/);
  assert.doesNotMatch(codes, /searchParams\.set\("code"/);
  assert.doesNotMatch(codes, /export function bookingTicketVerifyUrl/);
});

test("the scan route authenticates, verifies origin, rate-limits, and mutates nothing", async () => {
  const scan = await readFile(api("scan"), "utf8");
  assert.match(scan, /SCAN_EVENT_TICKETS/);
  assert.match(scan, /verifyTrustedOrigin/);
  assert.match(scan, /rateLimit\(/);
  assert.match(scan, /decodeTicketScanPayload/);
  assert.match(scan, /verifyScannedTicket/);
  // Reading a ticket must never admit anyone: the officer compares the name to
  // an ID document first, then commits through the check-in route.
  assert.doesNotMatch(scan, /checkInBooking/);
  assert.doesNotMatch(scan, /prisma\.eventBooking\.(update|create|delete)/);
  assert.match(scan, /Cache-Control.*no-store/);
});

test("the scan route withholds holder identity until the code proves the ticket", async () => {
  const scan = await readFile(api("scan"), "utf8");
  // A bare reference number must not turn a guess into a citizen's name.
  assert.match(scan, /\["NOT_FOUND", "CODE_MISMATCH", "TAMPERED"\]\.includes\(result\)/);
  assert.match(scan, /identified\s*\?/);
});

test("check-in stays the single mutating door action and stays permission-gated", async () => {
  const checkIn = await readFile(api("check-in"), "utf8");
  assert.match(checkIn, /SCAN_EVENT_TICKETS/);
  assert.match(checkIn, /verifyTrustedOrigin/);
  assert.match(checkIn, /checkInBooking/);
});

test("the camera is allowed on the scanner screen and nowhere else", async () => {
  const config = await readFile(repo("next.config.mjs"), "utf8");
  // The site-wide policy denies the camera; without the narrow exception the
  // scanner is blocked by the browser before it ever asks for permission.
  assert.match(config, /"camera=\(\), microphone=\(\), geolocation=\(\)"/);
  assert.match(config, /source: "\/admin\/scan"/);
  assert.match(config, /"camera=\(self\), microphone=\(\), geolocation=\(\)"/);
});

test("the scanner screen decodes in the browser and posts to the scan route", async () => {
  const scanner = await readFile(repo("src", "components", "admin", "TicketScanner.jsx"), "utf8");
  assert.match(scanner, /getUserMedia/);
  assert.match(scanner, /BarcodeDetector/);
  assert.match(scanner, /import\("jsqr"\)/, "iOS Safari has no BarcodeDetector and still has to work");
  assert.match(scanner, /\/api\/admin\/tickets\/scan/);
  assert.match(scanner, /\/api\/admin\/tickets\/check-in/);
  // The decryption key never reaches the browser.
  assert.doesNotMatch(scanner, /BOOKING_TICKET_SECRET|decodeTicketScanPayload/);
});
