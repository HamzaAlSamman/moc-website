import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getCitizenSession } from "./citizen-session";
import { prisma } from "./prisma";

// Mirrors src/lib/dal.js's shape for CMS staff, but reads exclusively from
// prisma.citizen — never prisma.user. A citizen and a staff account must
// never be resolvable through the same code path; keeping the two DALs
// separate (on top of the audience check in crypto.js) means a bug in one
// can't accidentally start authenticating the other kind of principal.

export const verifyCitizenSession = cache(async (locale = "ar") => {
  const session = await getCitizenSession();

  if (!session?.citizenId) {
    redirect(`/${locale}/account/login`);
  }

  const citizen = await prisma.citizen.findUnique({
    where: { id: session.citizenId },
    select: { id: true, isActive: true, isBlocked: true, sessionVersion: true },
  });

  if (!citizen || !citizen.isActive || citizen.isBlocked) {
    redirect(`/${locale}/account/login`);
  }

  // sessionVersion is bumped on password change, "log out everywhere," and
  // admin block. A token whose sessionVersion no longer matches the row
  // predates one of those events and must be treated as invalid — there is
  // no server-side session store to revoke, so this comparison IS the
  // revocation mechanism.
  if (citizen.sessionVersion !== session.sessionVersion) {
    redirect(`/${locale}/account/login`);
  }

  return { isAuth: true, citizenId: citizen.id };
});

export const getCurrentCitizen = cache(async (locale = "ar") => {
  const session = await verifyCitizenSession(locale);

  const citizen = await prisma.citizen.findUnique({
    where: { id: session.citizenId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      emailVerifiedAt: true,
      identityStatus: true,
      identityRejectedReason: true,
      nationalIdLast4: true,
      isActive: true,
      isBlocked: true,
      createdAt: true,
    },
  });

  if (!citizen || !citizen.isActive || citizen.isBlocked) {
    redirect(`/${locale}/account/login`);
  }

  return citizen;
});

/**
 * Non-redirecting variant for code paths that need to know "is anyone
 * logged in" without forcing a redirect — e.g. the public event page,
 * which must render for anonymous visitors and only change its booking
 * button based on session state.
 */
export async function getCurrentCitizenOptional() {
  const session = await getCitizenSession();
  if (!session?.citizenId) return null;

  const citizen = await prisma.citizen.findUnique({
    where: { id: session.citizenId },
    select: { id: true, isActive: true, isBlocked: true, sessionVersion: true },
  });

  if (!citizen || !citizen.isActive || citizen.isBlocked) return null;
  if (citizen.sessionVersion !== session.sessionVersion) return null;

  return { citizenId: citizen.id };
}
