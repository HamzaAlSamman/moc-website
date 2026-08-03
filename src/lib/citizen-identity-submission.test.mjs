import assert from "node:assert/strict";
import test from "node:test";

import {
  CitizenIdentitySubmissionError,
  createCitizenIdentitySubmissionService,
} from "./citizen-identity-submission-core.mjs";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xdb]);

function createHarness(overrides = {}) {
  const files = new Map();
  const removed = [];
  const citizen = {
    id: "citizen-1",
    sessionVersion: 3,
    emailVerifiedAt: new Date("2026-08-01T00:00:00.000Z"),
    identityStatus: "NOT_SUBMITTED",
    identityFrontFileKey: null,
    identityBackFileKey: null,
    isActive: true,
    isBlocked: false,
    ...overrides.citizen,
  };
  let keyNumber = 0;
  const repository = {
    async findCitizen() {
      return { ...citizen };
    },
    async replaceIdentitySubmission(input) {
      if (overrides.databaseFailure) throw new Error("database unavailable");
      if (input.expectedStatus !== citizen.identityStatus) {
        throw new CitizenIdentitySubmissionError("IDENTITY_STATE_CHANGED");
      }
      Object.assign(citizen, {
        identityStatus: "PENDING",
        identitySubmittedAt: input.submittedAt,
        identityFrontFileKey: input.frontFileKey,
        identityBackFileKey: input.backFileKey,
        identityRejectedAt: null,
        identityRejectedReason: null,
      });
      return { ...citizen };
    },
  };
  const service = createCitizenIdentitySubmissionService({
    repository,
    validateUpload: ({ bytes, declaredMimeType }) => {
      if (!bytes?.length || !["image/png", "image/jpeg"].includes(declaredMimeType)) {
        throw new Error("invalid image");
      }
      return { mimeType: declaredMimeType, size: bytes.length };
    },
    createStorageKey: (_citizenId, mimeType) => `citizen-1/file-${++keyNumber}.${mimeType === "image/png" ? "png" : "jpg"}`,
    writeFile: async (key, bytes) => {
      if (overrides.failWriteKey === keyNumber) throw new Error("disk unavailable");
      files.set(key, Buffer.from(bytes));
    },
    removeFile: async (key) => {
      removed.push(key);
      files.delete(key);
    },
    now: () => new Date("2026-08-02T12:00:00.000Z"),
  });
  return { citizen, files, removed, service };
}

function submissionInput() {
  return {
    citizenId: "citizen-1",
    sessionVersion: 3,
    front: { bytes: PNG, declaredMimeType: "image/png" },
    back: { bytes: JPEG, declaredMimeType: "image/jpeg" },
  };
}

test("a verified-email citizen submits two private images and becomes PENDING", async () => {
  const harness = createHarness();
  const result = await harness.service.submitCitizenIdentity(submissionInput());
  assert.deepEqual(result, { identityStatus: "PENDING", submittedAt: new Date("2026-08-02T12:00:00.000Z") });
  assert.equal(harness.files.size, 2);
  assert.equal(harness.citizen.identityStatus, "PENDING");
  assert.match(harness.citizen.identityFrontFileKey, /^citizen-1\//);
  assert.match(harness.citizen.identityBackFileKey, /^citizen-1\//);
});

test("email, account, session, and state checks happen before any file write", async () => {
  const cases = [
    [{ emailVerifiedAt: null }, "EMAIL_UNVERIFIED"],
    [{ isActive: false }, "ACCOUNT_UNAVAILABLE"],
    [{ isBlocked: true }, "ACCOUNT_UNAVAILABLE"],
    [{ sessionVersion: 4 }, "AUTH_REQUIRED"],
    [{ identityStatus: "PENDING" }, "IDENTITY_ALREADY_PENDING"],
    [{ identityStatus: "VERIFIED" }, "IDENTITY_ALREADY_VERIFIED"],
  ];
  for (const [citizen, code] of cases) {
    const harness = createHarness({ citizen });
    await assert.rejects(harness.service.submitCitizenIdentity(submissionInput()), (error) => error.code === code);
    assert.equal(harness.files.size, 0);
  }
});

test("both images are validated before either one is written", async () => {
  const harness = createHarness();
  const input = submissionInput();
  input.back.declaredMimeType = "application/pdf";
  await assert.rejects(
    harness.service.submitCitizenIdentity(input),
    (error) => error.code === "IDENTITY_INVALID_FILE" && error.cause?.message === "invalid image",
  );
  assert.equal(harness.files.size, 0);
});

test("a second file write failure removes the first newly written file", async () => {
  const harness = createHarness({ failWriteKey: 2 });
  await assert.rejects(
    harness.service.submitCitizenIdentity(submissionInput()),
    (error) => error.code === "IDENTITY_STORAGE_FAILED" && error.cause?.message === "disk unavailable",
  );
  assert.equal(harness.files.size, 0);
  assert.deepEqual(harness.removed, ["citizen-1/file-1.png"]);
});

test("a database failure removes new files and keeps rejected submission files", async () => {
  const harness = createHarness({
    databaseFailure: true,
    citizen: {
      identityStatus: "REJECTED",
      identityFrontFileKey: "citizen-1/old-front.jpg",
      identityBackFileKey: "citizen-1/old-back.jpg",
    },
  });
  harness.files.set("citizen-1/old-front.jpg", JPEG);
  harness.files.set("citizen-1/old-back.jpg", JPEG);
  await assert.rejects(harness.service.submitCitizenIdentity(submissionInput()), /database unavailable/);
  assert.equal(harness.files.has("citizen-1/old-front.jpg"), true);
  assert.equal(harness.files.has("citizen-1/old-back.jpg"), true);
  assert.deepEqual(harness.removed.sort(), ["citizen-1/file-1.png", "citizen-1/file-2.jpg"].sort());
});

test("a rejected resubmission deletes old files only after the database switches keys", async () => {
  const harness = createHarness({
    citizen: {
      identityStatus: "REJECTED",
      identityFrontFileKey: "citizen-1/old-front.jpg",
      identityBackFileKey: "citizen-1/old-back.jpg",
      identityRejectedAt: new Date("2026-08-01T00:00:00.000Z"),
      identityRejectedReason: "غير واضحة",
    },
  });
  harness.files.set("citizen-1/old-front.jpg", JPEG);
  harness.files.set("citizen-1/old-back.jpg", JPEG);
  await harness.service.submitCitizenIdentity(submissionInput());
  assert.deepEqual(harness.removed.sort(), ["citizen-1/old-front.jpg", "citizen-1/old-back.jpg"].sort());
  assert.equal(harness.citizen.identityRejectedReason, null);
  assert.equal(harness.files.size, 2);
});
