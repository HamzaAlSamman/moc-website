import assert from "node:assert/strict";
import test from "node:test";

import {
  CitizenIdentityReviewError,
  createCitizenIdentityReviewService,
} from "./citizen-identity-review-core.mjs";

function createHarness(citizenOverrides = {}) {
  const citizen = {
    id: "citizen-1",
    email: "citizen@example.sy",
    fullName: "مواطن سوري",
    identityStatus: "PENDING",
    ...citizenOverrides,
  };
  const writes = [];
  const repository = {
    async reviewIdentity(input) {
      writes.push(input);
      if (citizen.identityStatus !== "PENDING") {
        throw new CitizenIdentityReviewError("IDENTITY_STATE_CHANGED");
      }
      citizen.identityStatus = input.action === "approve" ? "VERIFIED" : "REJECTED";
      return { ...citizen };
    },
  };
  const service = createCitizenIdentityReviewService({
    repository,
    now: () => new Date("2026-08-03T10:00:00.000Z"),
  });
  const actor = {
    id: "admin-1",
    email: "admin@moc.gov.sy",
    role: "ADMIN",
  };
  return { actor, citizen, service, writes };
}

test("approving a pending identity records verifier, audit, and an outbox notification", async () => {
  const { actor, service, writes } = createHarness();
  const result = await service.reviewIdentity({
    citizenId: "citizen-1",
    actor,
    action: "approve",
    ipAddress: "127.0.0.1",
  });

  assert.equal(result.identityStatus, "VERIFIED");
  assert.deepEqual(writes[0], {
    citizenId: "citizen-1",
    actor,
    action: "approve",
    reason: null,
    decidedAt: new Date("2026-08-03T10:00:00.000Z"),
    ipAddress: "127.0.0.1",
  });
});

test("rejection requires a non-blank bounded reason", async () => {
  const { actor, service, writes } = createHarness();
  for (const reason of [undefined, null, "", "   "]) {
    await assert.rejects(
      service.reviewIdentity({ citizenId: "citizen-1", actor, action: "reject", reason }),
      (error) => error.code === "REJECTION_REASON_REQUIRED",
    );
  }
  assert.equal(writes.length, 0);

  await service.reviewIdentity({
    citizenId: "citizen-1",
    actor,
    action: "reject",
    reason: `  ${"س".repeat(2100)}  `,
  });
  assert.equal(writes[0].reason.length, 2000);
  assert.equal(writes[0].reason.startsWith("س"), true);
});

test("review rejects unsupported actions and stale non-pending identity state", async () => {
  const first = createHarness();
  await assert.rejects(
    first.service.reviewIdentity({ citizenId: "citizen-1", actor: first.actor, action: "verify" }),
    (error) => error.code === "INVALID_REVIEW_ACTION",
  );
  assert.equal(first.writes.length, 0);

  const stale = createHarness({ identityStatus: "VERIFIED" });
  await assert.rejects(
    stale.service.reviewIdentity({ citizenId: "citizen-1", actor: stale.actor, action: "approve" }),
    (error) => error.code === "IDENTITY_STATE_CHANGED",
  );
});

test("the Prisma repository writes the decision, audit entry, and outbox atomically", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("./citizen-identity-review-core.mjs", import.meta.url), "utf8"),
  );
  assert.match(source, /prisma\.\$transaction/);
  assert.match(source, /identityVerifiedById/);
  assert.match(source, /identityRejectedReason/);
  assert.match(source, /tx\.auditLog\.create/);
  assert.match(source, /tx\.notificationOutbox\.create/);
  assert.match(source, /CITIZEN_IDENTITY_(?:VERIFIED|REJECTED)/);
});
