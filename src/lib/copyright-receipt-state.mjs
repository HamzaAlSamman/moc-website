// A wallet claim is not a verified payment. Shared by the tracking UI/API.
export function isCopyrightReceiptAvailable(submission, stage = "initial") {
  if (submission.receipts) return submission.receipts[stage] === true;
  if (stage === "final") return submission.applicationStatus === "completed" && submission.paymentStatus === "fully_paid";
  return ["initial_paid", "final_paid", "fully_paid"].includes(submission.paymentStatus)
    && ["under_review", "suspended", "rejected", "pending_final_approval", "pending_fees", "final_review", "completed"].includes(submission.applicationStatus);
}
