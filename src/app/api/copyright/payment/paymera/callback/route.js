import { NextResponse } from "next/server";
import { confirmPaymeraCopyrightPayment } from "@/lib/copyright-payments";
import { appBaseUrl } from "@/lib/paymera.mjs";

// GET: where Paymera sends the citizen's own browser back to after Cancel or
// Finish. Never assume success just because the user landed here — check the
// authoritative status (same call the triggerURL hit already made, run again
// in case that one didn't land) and hand the copyright page a status it can
// show, via the same `?code=` tracker lookup the page already supports.
//
// The redirect target must come from APP_BASE_URL, not from `request.url`'s
// own origin — same rule as the password-reset links (see AGENTS.md). Behind
// this server's Apache reverse proxy, `new URL(request.url).origin` resolves
// to the app's own internal bind address (http://localhost:3001) rather than
// https://moc.gov.sy, sending the citizen's browser to a host only the server
// itself can reach.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const submissionId = searchParams.get("submissionId");
  const stage = searchParams.get("stage");
  const locale = searchParams.get("locale") === "en" ? "en" : "ar";
  const origin = appBaseUrl();

  if (!submissionId || (stage !== "initial" && stage !== "final")) {
    return NextResponse.redirect(`${origin}/${locale}/services/copyright`);
  }

  let status = "UNKNOWN";
  try {
    status = await confirmPaymeraCopyrightPayment(submissionId, stage);
  } catch (err) {
    console.error("Paymera callback error:", err);
  }

  const target = new URL(`${origin}/${locale}/services/copyright`);
  target.searchParams.set("code", submissionId);
  target.searchParams.set("paymera", status);
  return NextResponse.redirect(target);
}
