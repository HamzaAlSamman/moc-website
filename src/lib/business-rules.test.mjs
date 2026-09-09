import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertValidEvent,
  canChangePostStatus,
  canTransitionCopyright,
  canTransitionEventSubmission,
  normalizeSustainable,
  toPublicCopyrightSubmission,
  validateEventSubmissionInput,
  validateUploadedDocument,
  validateCopyrightWorkSource,
} from "./business-rules.mjs";

test("event end cannot precede start", () => {
  assert.throws(
    () => assertValidEvent({ startDate: "2026-08-20T10:00", endDate: "2026-08-19T10:00", status: "UPCOMING" }),
    /endDate/,
  );
});

test("event operational state must agree with its dates", () => {
  assert.throws(
    () => assertValidEvent({ startDate: "2099-08-20T10:00", endDate: "2099-08-20T11:00", status: "COMPLETED" }, new Date("2026-07-14T10:00:00Z")),
    /status/,
  );
});

test("copyright workflow is owned by the current stage role", () => {
  assert.equal(canTransitionCopyright("FINANCE", "finance_review", "under_review"), true);
  assert.equal(canTransitionCopyright("FINANCE", "submitted", "completed"), false);
  assert.equal(canTransitionCopyright("STUDIES_ASSESSOR", "finance_review", "under_review"), false);
  assert.equal(canTransitionCopyright("DEPUTY_MINISTER", "pending_final_approval", "pending_fees"), true);
  assert.equal(canTransitionCopyright("ADMIN", "submitted", "completed"), false);
});

test("final fee verification dispatches to a cultural center instead of completing directly", () => {
  assert.equal(canTransitionCopyright("FINANCE", "final_review", "pending_center_delivery"), true);
  assert.equal(canTransitionCopyright("FINANCE", "final_review", "completed"), false);
  assert.equal(canTransitionCopyright("ADMIN", "final_review", "pending_center_delivery"), true);
});

test("only a cultural center officer completes a delivery, and only from pending_center_delivery", () => {
  assert.equal(canTransitionCopyright("CULTURAL_CENTER_OFFICER", "pending_center_delivery", "completed"), true);
  assert.equal(canTransitionCopyright("CULTURAL_CENTER_OFFICER", "final_review", "completed"), false);
  assert.equal(canTransitionCopyright("FINANCE", "pending_center_delivery", "completed"), false);
  assert.equal(canTransitionCopyright("ADMIN", "pending_center_delivery", "completed"), true);
});

test("public copyright DTO never exposes attachments or internal review data", () => {
  const dto = toPublicCopyrightSubmission({
    id: "case-1",
    applicantName: "Applicant",
    applicantEmail: "a@example.com",
    applicationStatus: "suspended",
    paymentStatus: "initial_paid",
    deficiencyNote: "missing id",
    workFile: "data:application/zip;base64,AAAA",
    idFileFront: "secret",
    paymentReceipt: "secret",
    reviewNotes: [{ text: "internal" }],
    internalRefNumber: "INT-1",
  });

  assert.equal(dto.id, "case-1");
  assert.equal(dto.applicantName, "Applicant");
  assert.equal(dto.applicationStatus, "suspended");
  assert.equal(dto.paymentStatus, "initial_paid");
  assert.equal(dto.deficiencyNote, "missing id");
  for (const privateField of ["workFile", "idFileFront", "paymentReceipt", "reviewNotes", "internalRefNumber"]) {
    assert.equal(privateField in dto, false, `${privateField} must not be public`);
  }
});

test("copyright work is a PDF or ZIP up to 100 MiB, or a Google Drive URL", () => {
  const zip = `data:application/zip;base64,${Buffer.from([0x50, 0x4b, 0x03, 0x04]).toString("base64")}`;
  const pdf = `data:application/pdf;base64,${Buffer.from("%PDF-1.7\n").toString("base64")}`;
  assert.deepEqual(validateCopyrightWorkSource({ workFile: zip }), { workFile: zip, workDriveUrl: null });
  assert.deepEqual(validateCopyrightWorkSource({ workFile: pdf }), { workFile: pdf, workDriveUrl: null });
  assert.deepEqual(
    validateCopyrightWorkSource({ workDriveUrl: "https://drive.google.com/file/d/abc/view" }),
    { workFile: null, workDriveUrl: "https://drive.google.com/file/d/abc/view" },
  );
  assert.throws(() => validateCopyrightWorkSource({ workFile: "data:application/pdf;base64,SGk=" }), /valid PDF/);
  assert.throws(() => validateCopyrightWorkSource({ workFile: "data:text/plain;base64,SGk=" }), /PDF or ZIP/);
  assert.throws(() => validateCopyrightWorkSource({ workDriveUrl: "https://example.com/file" }), /Drive/);
});

test("one-off event submissions remain non-sustainable", () => {
  assert.equal(normalizeSustainable("yes"), true);
  assert.equal(normalizeSustainable("no"), false);
  assert.equal(normalizeSustainable(true), true);
  assert.throws(() => normalizeSustainable("maybe"), /isSustainable/);
});

test("event submissions can move freely between valid statuses", () => {
  assert.equal(canTransitionEventSubmission("PENDING", "UNDER_REVIEW"), true);
  assert.equal(canTransitionEventSubmission("UNDER_REVIEW", "APPROVED"), true);
  assert.equal(canTransitionEventSubmission("APPROVED", "PENDING"), true);
  assert.equal(canTransitionEventSubmission("REJECTED", "UNDER_REVIEW"), true);
  assert.equal(canTransitionEventSubmission("PENDING", "CONDITIONAL"), true);
  assert.equal(canTransitionEventSubmission("APPROVED", "APPROVED"), true);
  assert.equal(canTransitionEventSubmission("PENDING", "NOT_A_STATUS"), false);
});

test("authors may edit published content but cannot change publication status", () => {
  assert.equal(canChangePostStatus("AUTHOR", "PUBLISHED", "PUBLISHED"), true);
  assert.equal(canChangePostStatus("AUTHOR", "PUBLISHED", "DRAFT"), false);
  assert.equal(canChangePostStatus("EDITOR", "PUBLISHED", "DRAFT"), true);
});

test("event submission requires contact, goals and consistent sustainability", () => {
  const base = {
    applicantName: "Applicant",
    phone: "0999999999",
    eventName: "Festival",
    description: "Description",
    goals: ["Goal"],
    agreedToTerms: true,
    isSustainable: "no",
  };
  assert.equal(validateEventSubmissionInput(base).isSustainable, false);
  assert.throws(() => validateEventSubmissionInput({ ...base, phone: "" }), /contact/);
  assert.throws(() => validateEventSubmissionInput({ ...base, goals: [] }), /goals/);
  assert.throws(
    () => validateEventSubmissionInput({ ...base, isSustainable: "yes", sustainabilityNote: "" }),
    /sustainabilityNote/,
  );
});

test("uploaded documents use an allowed type and matching file signature", () => {
  const pdf = `data:application/pdf;base64,${Buffer.from("%PDF-1.7").toString("base64")}`;
  assert.equal(validateUploadedDocument(pdf, "idFileFront"), pdf);
  assert.throws(
    () => validateUploadedDocument("data:text/plain;base64,SGVsbG8=", "idFileFront"),
    /idFileFront/,
  );
});
