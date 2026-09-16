import { NextResponse } from "next/server";
import { confirmPaymeraCopyrightPayment } from "@/lib/copyright-payments";

// GET: Paymera's payment-result page makes a hidden call to this URL the
// moment the user finishes (success or failure) — before they've clicked
// Finish, so this is the earliest we can hear about the outcome. Per the
// vendor's own spec this call carries no indication of the result; it only
// means "check now". We always respond 200 so Paymera doesn't retry — a
// pending/mismatched/unknown status here isn't an error, it's something the
// citizen's own return trip (callbackURL) or a later manual check settles.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const submissionId = searchParams.get("submissionId");
  const stage = searchParams.get("stage");
  if (!submissionId || (stage !== "initial" && stage !== "final")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    const status = await confirmPaymeraCopyrightPayment(submissionId, stage);
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error("Paymera trigger error:", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
