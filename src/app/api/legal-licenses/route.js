import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { nextReferenceNumber, REFERENCE_SCOPES } from "@/lib/reference-number";
import {
  createLegalLicenseAccessToken,
  hashLegalLicenseAccessToken,
} from "@/lib/legal-license-storage.mjs";
import { normalizeLegalLicenseDraft, legalLicenseFounderWriteData } from "@/lib/legal-license-api.mjs";
import { LEGAL_LICENSE_INCLUDE, legalLicenseError, legalLicenseJson } from "@/lib/legal-license-server";
import { sendLegalLicenseCitizenEmail } from "@/lib/legal-license-mailer";

export async function POST(request) {
  if (!rateLimit(`legal-license-create:${getClientIp(request)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many draft requests" }, { status: 429 });
  }
  try {
    const draft = normalizeLegalLicenseDraft(await request.json());
    const accessToken = createLegalLicenseAccessToken();
    const referenceNo = await nextReferenceNumber(REFERENCE_SCOPES.LEGAL_LICENSE);
    const { founders, ...applicationData } = draft;
    const application = await prisma.legalLicenseApplication.create({
      data: {
        ...applicationData,
        referenceNo,
        accessTokenHash: hashLegalLicenseAccessToken(accessToken),
        founders: { create: founders.map(legalLicenseFounderWriteData) },
        history: { create: { action: "DRAFT_CREATED", toStatus: "DRAFT", publicNote: "Draft created" } },
      },
      include: LEGAL_LICENSE_INCLUDE,
    });
    sendLegalLicenseCitizenEmail(application, "DRAFT_SAVED", { accessToken }).catch((error) => {
      console.error("Legal-license draft email failed:", error);
    });
    return NextResponse.json(legalLicenseJson(application, { accessToken }), { status: 201 });
  } catch (error) {
    console.error("Legal-license draft creation failed:", error);
    const response = legalLicenseError(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
