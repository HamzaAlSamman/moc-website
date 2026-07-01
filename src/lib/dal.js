import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "./session";
import { prisma } from "./prisma";

export const verifySession = cache(async () => {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/admin/login");
  }

  return { isAuth: true, userId: session.userId, role: session.role };
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      nameAr: true,
      nameEn: true,
      role: true,
      avatar: true,
      isActive: true,
      mustChangePassword: true,
    },
  });

  if (!user || !user.isActive) {
    redirect("/admin/login");
  }

  return user;
});

export async function getSessionOptional() {
  const session = await getSession();
  if (!session?.userId) return null;
  return session;
}
