import "server-only";
import { prisma } from "@/lib/prisma";
import { isCopyrightReceiptAvailable } from "@/lib/copyright-receipt-state.mjs";

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
