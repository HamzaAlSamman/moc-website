import { NextResponse } from "next/server";
import { getCitizenSession } from "@/lib/citizen-session";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Check Citizen session
    const citizenSession = await getCitizenSession();
    if (citizenSession?.citizenId) {
      const citizen = await prisma.citizen.findUnique({
        where: { id: citizenSession.citizenId },
        select: {
          id: true,
          fullName: true,
          email: true,
          identityStatus: true,
          sessionVersion: true,
          isActive: true,
          isBlocked: true,
        },
      });

      if (
        citizen &&
        citizen.isActive &&
        !citizen.isBlocked &&
        citizen.sessionVersion === citizenSession.sessionVersion
      ) {
        return NextResponse.json({
          authenticated: true,
          role: "citizen",
          user: {
            id: citizen.id,
            fullName: citizen.fullName,
            email: citizen.email,
            identityStatus: citizen.identityStatus,
          },
        });
      }
    }

    // 2. Check CMS Staff/Admin session
    const cmsSession = await getSession();
    if (cmsSession?.userId) {
      const staffUser = await prisma.user.findUnique({
        where: { id: cmsSession.userId },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
        },
      });

      if (staffUser && staffUser.isActive) {
        return NextResponse.json({
          authenticated: true,
          role: "admin",
          user: {
            id: staffUser.id,
            fullName: staffUser.fullName,
            email: staffUser.email,
            adminRole: staffUser.role,
          },
        });
      }
    }

    return NextResponse.json({ authenticated: false, role: null, user: null });
  } catch (error) {
    return NextResponse.json({ authenticated: false, role: null, user: null });
  }
}
