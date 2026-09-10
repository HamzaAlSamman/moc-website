import "server-only";
import { prisma } from "./prisma";
import { getCurrentCitizenOptional } from "./citizen-dal";

/**
 * Auto-links a citizen-trackable record (copyright submission, legal-license
 * application) to the logged-in citizen's account when they look it up and
 * it isn't linked to anyone yet, provided their account email matches the
 * record's own applicant email. Used for records filed before the citizen
 * had an account, or filed anonymously.
 *
 * Reaching this point already required out-of-band knowledge (the record's
 * code, or reference + access token) — this only decides whether to attach
 * an *already-reachable* record to the viewer's account, it never grants
 * lookup access, so it is not an enumeration risk.
 *
 * @param {"copyrightSubmission"|"legalLicenseApplication"} modelName
 * @param {{ id: string, citizenId: string|null, applicantEmail: string|null|undefined }} record
 * @returns {Promise<string|null>} the citizenId now on the record (existing or newly claimed)
 */
export async function claimRecordForLoggedInCitizen(modelName, record) {
  if (record.citizenId) return record.citizenId;
  if (!record.applicantEmail) return null;

  const citizen = await getCurrentCitizenOptional();
  if (!citizen) return null;

  const citizenRow = await prisma.citizen.findUnique({
    where: { id: citizen.citizenId },
    select: { email: true },
  });
  if (!citizenRow || citizenRow.email.trim().toLowerCase() !== record.applicantEmail.trim().toLowerCase()) {
    return null;
  }

  await prisma[modelName].update({ where: { id: record.id }, data: { citizenId: citizen.citizenId } });
  return citizen.citizenId;
}
