import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isPaymentGatewayActive } from "@/lib/payment-gateways.mjs";
import { getFeesForRole } from "@/lib/copyright-fees.mjs";
import { createPaymeraPayment } from "@/lib/paymera.mjs";

const STAGE_FIELD = { initial: "paymeraInitialPaymentId", final: "paymeraFinalPaymentId" };

// POST: starts a Paymera eGate session for one copyright fee stage and
// returns the URL to redirect the citizen's browser to. Mirrors the
// eligibility rules `/api/copyright` PUT enforces for pay_initial/pay_final,
// since a payment session created for a stage the submission can't pay yet
// would just be money Paymera holds with nowhere for it to land.
export async function POST(request) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(`paymera-create:${ip}`, 10, 30 * 60 * 1000)) {
      return NextResponse.json({ error: "محاولات كثيرة جداً، يرجى المحاولة لاحقاً" }, { status: 429 });
    }

    if (!isPaymentGatewayActive("paymearia")) {
      return NextResponse.json({ error: "وسيلة الدفع غير مفعّلة" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const id = body?.id;
    const stage = body?.stage;
    if (typeof id !== "string" || !id.trim() || !STAGE_FIELD[stage]) {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    const submission = await prisma.copyrightSubmission.findUnique({ where: { id } });
    if (!submission) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const eligible = stage === "initial"
      ? submission.applicationStatus === "submitted" && submission.paymentStatus === "pending"
      : submission.applicationStatus === "pending_fees";
    if (!eligible) {
      return NextResponse.json({ error: "لا يمكن الدفع في هذه المرحلة" }, { status: 409 });
    }

    const fees = getFeesForRole(submission.applicantRole);
    const amount = stage === "initial" ? fees.initialTotal : fees.finalTotal;
    const lang = body?.locale === "en" ? "en" : "ar";

    const { paymentId, paymentUrl } = await createPaymeraPayment({ amount, submissionId: id, stage, lang });

    // Recorded so the trigger/callback routes — which only receive
    // submissionId+stage on their URL — know which Paymera session to check.
    await prisma.copyrightSubmission.update({
      where: { id }, data: { [STAGE_FIELD[stage]]: paymentId },
    });

    return NextResponse.json({ paymentId, paymentUrl });
  } catch (err) {
    if (err.code === "PAYMERA_CONFIG_MISSING" || err.code === "APP_BASE_URL_MISSING") {
      console.error("Paymera create-payment configuration error:", err.message);
      return NextResponse.json({ error: "بوابة بيميرا غير مهيأة حالياً، يرجى اختيار وسيلة دفع أخرى" }, { status: 503 });
    }
    console.error("Paymera create-payment error:", err);
    return NextResponse.json({ error: "تعذر بدء عملية الدفع عبر بيميرا" }, { status: 502 });
  }
}
