import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("citizen portal exposes the complete public account journey", async () => {
  const paths = [
    "app/[locale]/account/login/page.js",
    "app/[locale]/account/register/page.js",
    "app/[locale]/account/verify-email/page.js",
    "app/[locale]/account/forgot/page.js",
    "app/[locale]/account/reset/page.js",
    "app/[locale]/account/profile/page.js",
    "app/[locale]/account/identity/page.js",
    "app/[locale]/account/bookings/page.js",
    "app/[locale]/account/bookings/[reference]/ticket/page.js",
  ];
  const pages = await Promise.all(paths.map(source));
  assert.match(pages.join("\n"), /CitizenAuthForm/);
  assert.match(pages.join("\n"), /CitizenIdentityForm/);
  assert.match(pages.join("\n"), /CitizenBookings/);
  assert.match(pages.join("\n"), /BookingTicket/);
});

test("OTP UI supports six digits, paste, resend countdown, and accessible status", async () => {
  const text = await source("components/citizen/CitizenAuthForm.jsx");
  assert.match(text, /inputMode="numeric"/);
  assert.match(text, /maxLength=\{1\}/);
  assert.match(text, /onPaste/);
  assert.match(text, /resendCountdown/);
  assert.match(text, /aria-live="polite"/);
});

test("event detail exposes internal booking states and login recovery", async () => {
  const text = await source("components/citizen/EventBookingPanel.jsx");
  for (const token of ["NOT_OPEN", "CLOSED", "FULL", "AUTH_REQUIRED", "IDENTITY_UNVERIFIED"]) {
    assert.match(text, new RegExp(token));
  }
  assert.match(text, /\/account\/login/);
  assert.match(text, /\/api\/citizen\/events\//);
});

test("admin surfaces cover citizen verification and event booking operations", async () => {
  const citizen = await source("components/admin/CitizenReviewDashboard.jsx");
  const booking = await source("components/admin/EventBookingDashboard.jsx");
  assert.match(citizen, /identity\/review/);
  assert.match(citizen, /identity\/front/);
  assert.match(citizen, /identity\/back/);
  assert.match(booking, /booking-settings/);
  assert.match(booking, /bookings\/export/);
  assert.match(booking, /check-in/);
  assert.match(booking, /manualReason/);
});

test("citizen controls meet minimum touch and focus affordances", async () => {
  const files = await Promise.all([
    source("components/citizen/CitizenAuthForm.jsx"),
    source("components/citizen/CitizenIdentityForm.jsx"),
    source("components/citizen/EventBookingPanel.jsx"),
  ]);
  const text = files.join("\n");
  assert.match(text, /min-h-11/);
  assert.match(text, /focus-visible:ring/);
  assert.match(text, /aria-describedby/);
});
