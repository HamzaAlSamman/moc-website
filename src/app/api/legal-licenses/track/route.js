import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  findCitizenLegalLicense,
  legalLicenseError,
  legalLicenseJson,
} from "@/lib/legal-license-server";
import {
  LEGAL_LICENSE_TRACK_MAX_JSON_BYTES,
  readLegalLicenseJson,
} from "@/lib/legal-license-request.mjs";
import { claimRecordForLoggedInCitizen } from "@/lib/citizen-submission-link.mjs";

export async function POST(request) {
  if (!rateLimit(`legal-license-track:${getClientIp(request)}`, 20, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many tracking attempts" }, { status: 429 });
  }
  let body;
  try {
    body = await readLegalLicenseJson(request, {
      maxBytes: LEGAL_LICENSE_TRACK_MAX_JSON_BYTES,
    });
  } catch (error) {
    const response = legalLicenseError(error, "Unable to track legal-license application");
    return NextResponse.json(response.body, { status: response.status });
  }
  const referenceNo = typeof body.referenceNo === "string" ? body.referenceNo.trim().toUpperCase() : "";
  if (!/^LIC-\d{4}-\d{4,}$/.test(referenceNo)) {
    return NextResponse.json({ error: "Invalid reference number" }, { status: 400 });
  }
  const forwarded = new Headers(request.headers);
  if (body.accessToken) forwarded.set("x-legal-license-token", body.accessToken);
  const authenticatedRequest = new Request(request.url, { headers: forwarded });
  const application = await findCitizenLegalLicense(authenticatedRequest, { referenceNo });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  // A citizen who filed this before creating an account (or via the
  // reference+access-token flow anonymously) gets it auto-attached to their
  // account the moment they track it while logged in, if the emails match.
  const claimedCitizenId = await claimRecordForLoggedInCitizen("legalLicenseApplication", {
    id: application.id,
    citizenId: application.citizenId,
    applicantEmail: application.email,
  });
  if (claimedCitizenId) application.citizenId = claimedCitizenId;

  return NextResponse.json(legalLicenseJson(application));
}
