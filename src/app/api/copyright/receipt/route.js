import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReceiptPdf } from "@/lib/receipt-pdf";

// GET /api/copyright/receipt?code=<submissionId>&stage=initial|final
//
// Lets a citizen download their official payment receipt straight from the
// tracking page, so they always have it even if the email attachment was
// stripped/blocked by their mail provider. The unguessable submission id (code)
// is the access token — same model as the tracking lookup. Gated by the
// services gate in proxy.js like the rest of /api/copyright.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim();
    const stage = searchParams.get("stage") === "final" ? "final" : "initial";

    if (!code) {
      return NextResponse.json({ error: "رمز المعاملة مطلوب" }, { status: 400 });
    }

    const submission = await prisma.copyrightSubmission.findUnique({ where: { id: code } });
    if (!submission) {
      return NextResponse.json({ error: "لم يتم العثور على معاملة بهذا الرمز" }, { status: 404 });
    }

    // The receipt only exists once the matching fee has actually been paid.
    const paid = submission.paymentStatus;
    const initialAvailable = paid === "initial_paid" || paid === "final_paid" || paid === "fully_paid";
    const finalAvailable = paid === "fully_paid";
    if ((stage === "initial" && !initialAvailable) || (stage === "final" && !finalAvailable)) {
      return NextResponse.json({ error: "الإيصال غير متاح لهذه المرحلة بعد" }, { status: 409 });
    }

    const pdf = await generateReceiptPdf(submission, { stage });
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="MOC-receipt-${submission.id}-${stage}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("Copyright receipt download error:", err);
    return NextResponse.json({ error: "تعذّر توليد الإيصال حالياً" }, { status: 500 });
  }
}
