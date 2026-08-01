import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  legalLicenseApplicationWriteData,
  legalLicenseFounderWriteData,
  normalizeLegalLicenseDraft,
} from "@/lib/legal-license-api.mjs";
import { readLegalLicenseJson } from "@/lib/legal-license-request.mjs";
import { sendLegalLicenseCitizenEmail } from "@/lib/legal-license-mailer";
import {
  findCitizenLegalLicense,
  LEGAL_LICENSE_INCLUDE,
  legalLicenseError,
  legalLicenseJson,
  legalLicenseTokenFromRequest,
} from "@/lib/legal-license-server";

export async function GET(request, { params }) {
  const { id } = await params;
  const application = await findCitizenLegalLicense(request, { id });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  return NextResponse.json(legalLicenseJson(application));
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const current = await findCitizenLegalLicense(request, { id });
  if (!current) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (!["DRAFT", "SUSPENDED"].includes(current.status)) {
    return NextResponse.json({ error: "Submitted applications are locked" }, { status: 423 });
  }
  try {
    const body = await readLegalLicenseJson(request);
    if (body.expectedUpdatedAt && new Date(body.expectedUpdatedAt).getTime() !== current.updatedAt.getTime()) {
      return NextResponse.json({ error: "The draft changed in another session" }, { status: 409 });
    }
    const draft = normalizeLegalLicenseDraft(body.draft || body);
    const { founders } = draft;
    const applicationData = legalLicenseApplicationWriteData(draft);
    const application = await prisma.$transaction(async (tx) => {
      const updated = await tx.legalLicenseApplication.updateMany({
        where: { id, status: current.status, updatedAt: current.updatedAt },
        data: { ...applicationData, revision: { increment: 1 } },
      });
      if (updated.count !== 1) return null;
      const existingIds = new Set(current.founders.map((founder) => founder.id));
      const retainedIds = founders.map((founder) => founder.id).filter((founderId) => existingIds.has(founderId));
      await tx.legalLicenseFounder.deleteMany({
        where: { applicationId: id, ...(retainedIds.length ? { id: { notIn: retainedIds } } : {}) },
      });
      for (const founder of founders) {
        const data = legalLicenseFounderWriteData(founder);
        if (founder.id && existingIds.has(founder.id)) {
          await tx.legalLicenseFounder.update({ where: { id: founder.id }, data });
        } else {
          await tx.legalLicenseFounder.create({ data: { ...data, applicationId: id } });
        }
      }
      return tx.legalLicenseApplication.findUnique({ where: { id }, include: LEGAL_LICENSE_INCLUDE });
    });
    if (!application) return NextResponse.json({ error: "The draft changed in another session" }, { status: 409 });
    if (application.email && application.email !== current.email) {
      const accessToken = legalLicenseTokenFromRequest(request);
      sendLegalLicenseCitizenEmail(application, "DRAFT_SAVED", { accessToken }).catch((error) => {
        console.error("Legal-license resume email failed:", error);
      });
    }
    return NextResponse.json(legalLicenseJson(application));
  } catch (error) {
    console.error("Legal-license draft save failed:", error);
    const response = legalLicenseError(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
