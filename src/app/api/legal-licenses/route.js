import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { nextReferenceNumber, REFERENCE_SCOPES } from "@/lib/reference-number";
import {
  createLegalLicenseAccessToken,
  hashLegalLicenseAccessToken,
} from "@/lib/legal-license-storage.mjs";
import {
  legalLicenseApplicationWriteData,
  legalLicenseFounderWriteData,
  normalizeLegalLicenseDraft,
} from "@/lib/legal-license-api.mjs";
import { readLegalLicenseJson } from "@/lib/legal-license-request.mjs";
import { LEGAL_LICENSE_INCLUDE, legalLicenseError, legalLicenseJson } from "@/lib/legal-license-server";
import { sendLegalLicenseCitizenEmail } from "@/lib/legal-license-mailer";
import { getCurrentCitizenOptional } from "@/lib/citizen-dal";
import { createDevLegalLicense, legalLicenseDevStoreEnabled } from "@/lib/legal-license-dev-store.mjs";

export async function POST(request) {
  if (!rateLimit(`legal-license-create:${getClientIp(request)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many draft requests" }, { status: 429 });
  }
  try {
    const draft = normalizeLegalLicenseDraft(await readLegalLicenseJson(request));
    const accessToken = createLegalLicenseAccessToken();
    if (legalLicenseDevStoreEnabled()) {
      const application = createDevLegalLicense(draft, accessToken);
      return NextResponse.json(legalLicenseJson(application, { accessToken }), { status: 201 });
    }
    const referenceNo = await nextReferenceNumber(REFERENCE_SCOPES.LEGAL_LICENSE);
    const { founders } = draft;
    const applicationData = legalLicenseApplicationWriteData(draft);
    // Attributes the application to the citizen's account automatically if
    // they're logged in — they never have to remember the access token later.
    const loggedInCitizen = await getCurrentCitizenOptional();
    const application = await prisma.legalLicenseApplication.create({
      data: {
        ...applicationData,
        referenceNo,
        citizenId: loggedInCitizen?.citizenId ?? null,
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
