import assert from "node:assert/strict";
import test from "node:test";

import { buildLegalLicenseHtml } from "./legal-license-pdf.js";

const application = {
  id: "app-1",
  referenceNo: "LIC-2026-0001",
  licenseType: "CULTURAL_FORUM",
  applicantName: "<script>alert(1)</script>",
  nationalId: "01234567890",
  phone: "0999999999",
  email: "citizen@example.com",
  capacity: "Founder",
  entityName: "Forum & Culture",
  purpose: "A public cultural purpose",
  objectives: "Objective one\nObjective two",
  activityDescription: "Cultural activities",
  governorate: "Damascus",
  address: "Main street",
  revision: 2,
  applicantSignature: "data:image/png;base64,iVBORw0KGgo=",
  founders: [
    {
      fullName: "Founder One",
      nationalId: "12345678901",
      phone: "0999999998",
      email: "founder@example.com",
      isAuthorizedRepresentative: true,
    },
  ],
  attachments: [
    { kind: "NATIONAL_ID_FRONT", originalName: "identity.pdf", version: 2 },
  ],
};

test("legal-license PDF HTML escapes citizen input and declares A4/Qomra assets", () => {
  const html = buildLegalLicenseHtml(application);

  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /@page\s*\{\s*size:\s*A4/);
  assert.match(html, /Qomra/);
  assert.match(html, /LIC-2026-0001/);
  assert.match(html, /Cultural Forum/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /Founder One/);
  assert.match(html, /identity\.pdf/);
  assert.match(html, /class="signature"/);
});

test("legal-license PDF output includes explicit visual-signature disclaimer", () => {
  const html = buildLegalLicenseHtml(application);
  assert.match(html, /visual declaration/i);
  assert.match(html, /not a qualified electronic signature/i);
});
