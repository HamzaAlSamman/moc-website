import "server-only";
import { prisma } from "@/lib/prisma";
import { isCopyrightReceiptAvailable } from "@/lib/copyright-receipt-state.mjs";
import { getPaymeraPaymentStatus } from "@/lib/paymera.mjs";
import { getFeesForRole } from "@/lib/copyright-fees.mjs";

export async function copyrightReceiptAvailability(submission) {
  const payments = await prisma.copyrightPayment.findMany({
    where: { submissionId: submission.id }, select: { stage: true, verifiedAt: true },
  });
  return Object.fromEntries(["initial", "final"].map(stage => {
    const payment = payments.find(p => p.stage === stage);
    const available = isCopyrightReceiptAvailable(submission, stage)
      && (payment ? !!payment.verifiedAt : stage === "final" || submission.paymentStatus === "initial_paid");
    return [stage, available];
  }));
}

export async function copyrightReceiptSubmission(submission, stage) {
  if (!isCopyrightReceiptAvailable(submission, stage)) return null;
  const payment = await prisma.copyrightPayment.findUnique({
    where: { submissionId_stage: { submissionId: submission.id, stage } },
  });
  if (payment) {
    if (!payment.verifiedAt) return null;
    return { ...submission, paymentRef: payment.reference, paymentGateway: payment.gateway, paymentReceipt: payment.receipt };
  }
  // Legacy rows can supply only the fee whose reference they still carry.
  if (stage === "initial" && submission.paymentStatus !== "initial_paid") return null;
  return submission;
}

const PAYMERA_STAGE_FIELD = { initial: "paymeraInitialPaymentId", final: "paymeraFinalPaymentId" };

function appBaseUrlForInternalCall() {
  const raw = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) throw new Error("APP_BASE_URL is required to record a Paymera payment");
  return new URL(raw).origin;
}

/**
 * Checks a Paymera payment's authoritative status and, once accepted ("A"),
 * records it through the exact same transition `/api/copyright` PUT uses for
 * a manually-entered payment — so a gateway-confirmed payment can never
 * drift from the finance-review/notification path a citizen-typed one
 * already goes through. Called from both the triggerURL and callbackURL
 * routes, so it must be safe to run twice: once the submission has moved
 * past this stage, the internal PUT call below reports a stale-state
 * conflict (409), which is treated as "already handled" rather than an
 * error.
 *
 * @param {string} submissionId
 * @param {"initial"|"final"} stage
 * @returns {Promise<"A"|"P"|"F"|"C"|"MISMATCH"|"UNKNOWN">} the status Paymera reported
 */
export async function confirmPaymeraCopyrightPayment(submissionId, stage) {
  const field = PAYMERA_STAGE_FIELD[stage];
  if (!field) return "UNKNOWN";
  const submission = await prisma.copyrightSubmission.findUnique({ where: { id: submissionId } });
  const paymentId = submission?.[field];
  if (!submission || !paymentId) return "UNKNOWN";

  const status = await getPaymeraPaymentStatus(paymentId);
  if (status.status !== "A") return status.status;

  // Cross-check against what we asked Paymera to collect for this exact
  // session, so a stray or replayed paymentId can't mark an unrelated or
  // underpaid submission as paid.
  const expectedAmount = getFeesForRole(submission.applicantRole)[stage === "initial" ? "initialTotal" : "finalTotal"];
  if (Number(status.amount) !== expectedAmount || status.notes !== `${submissionId}:${stage}`) {
    console.error("Paymera payment amount/notes mismatch", { submissionId, stage, paymentId, status });
    return "MISMATCH";
  }

  const action = stage === "initial" ? "pay_initial" : "pay_final";
  const response = await fetch(`${appBaseUrlForInternalCall()}/api/copyright`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: submissionId, action, paymentGateway: "paymearia", paymentRef: paymentId }),
  });
  if (!response.ok && response.status !== 409) {
    console.error("Paymera payment confirmed but recording it failed", { submissionId, stage, paymentId, status: response.status });
  }
  return "A";
}
