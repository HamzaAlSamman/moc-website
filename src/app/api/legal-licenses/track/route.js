import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { findCitizenLegalLicense, legalLicenseJson } from "@/lib/legal-license-server";

export async function POST(request) {
  if (!rateLimit(`legal-license-track:${getClientIp(request)}`, 20, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many tracking attempts" }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const referenceNo = typeof body.referenceNo === "string" ? body.referenceNo.trim().toUpperCase() : "";
  if (!/^LIC-\d{4}-\d{4,}$/.test(referenceNo)) {
    return NextResponse.json({ error: "Invalid reference number" }, { status: 400 });
  }
  const forwarded = new Headers(request.headers);
  if (body.accessToken) forwarded.set("x-legal-license-token", body.accessToken);
  const authenticatedRequest = new Request(request.url, { headers: forwarded });
  const application = await findCitizenLegalLicense(authenticatedRequest, { referenceNo });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  return NextResponse.json(legalLicenseJson(application));
}
