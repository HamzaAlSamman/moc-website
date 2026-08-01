import "server-only";
import { prisma } from "@/lib/prisma";
import { getSessionOptional } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { hashLegalLicenseAccessToken } from "@/lib/legal-license-storage.mjs";
import { toPublicLegalLicenseApplication } from "@/lib/legal-license.mjs";
import { legalLicenseError } from "@/lib/legal-license-errors.mjs";

export { legalLicenseError };

export const LEGAL_LICENSE_INCLUDE = Object.freeze({
  founders: { orderBy: { createdAt: "asc" } },
  attachments: { orderBy: [{ kind: "asc" }, { version: "desc" }] },
  history: { orderBy: { createdAt: "asc" } },
  reviewItems: {
    orderBy: [
      { applicationRevision: "asc" },
      { scope: "asc" },
      { requirementKey: "asc" },
    ],
  },
});

export function legalLicenseTokenFromRequest(request) {
  const explicit = request.headers.get("x-legal-license-token");
  if (explicit) return explicit.trim();
  const authorization = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() || "";
}

export async function findCitizenLegalLicense(request, { id, referenceNo } = {}) {
  const token = legalLicenseTokenFromRequest(request);
  if (!token) return null;
  let accessTokenHash;
  try { accessTokenHash = hashLegalLicenseAccessToken(token); } catch { return null; }
  return prisma.legalLicenseApplication.findFirst({
    where: {
      accessTokenHash,
      ...(id ? { id } : {}),
      ...(referenceNo ? { referenceNo } : {}),
    },
    include: LEGAL_LICENSE_INCLUDE,
  });
}

export async function canStaffAccessLegalLicenses() {
  const session = await getSessionOptional();
  if (!session?.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, isActive: true, email: true, nameAr: true, nameEn: true },
  });
  return user?.isActive && can(user.role, "VIEW_LEGAL_LICENSES") ? user : null;
}

export function legalLicenseJson(application, extra = {}) {
  return { application: toPublicLegalLicenseApplication(application), ...extra };
}
