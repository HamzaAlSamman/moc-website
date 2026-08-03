import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { getClientIp } from "@/lib/rate-limit";
import {
  detectCitizenIdentityMimeType,
  readCitizenIdentityPrivateFile,
} from "@/lib/citizen-identity-storage.mjs";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const actor = await getCurrentUser();
  if (!can(actor.role, "VIEW_CITIZEN_IDENTITY_FILES")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id, side } = await params;
  if (!['front', 'back'].includes(side)) return NextResponse.json({ error: "جانب غير صالح" }, { status: 400 });
  const citizen = await prisma.citizen.findUnique({
    where: { id },
    select: { id: true, email: true, identityFrontFileKey: true, identityBackFileKey: true },
  });
  if (!citizen) return NextResponse.json({ error: "المواطن غير موجود" }, { status: 404 });
  const storageKey = side === "front" ? citizen.identityFrontFileKey : citizen.identityBackFileKey;
  if (!storageKey) return NextResponse.json({ error: "الصورة غير موجودة" }, { status: 404 });
  const bytes = await readCitizenIdentityPrivateFile(storageKey).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (!bytes) return NextResponse.json({ error: "الصورة غير موجودة" }, { status: 404 });
  const mimeType = detectCitizenIdentityMimeType(bytes);
  if (!mimeType) return NextResponse.json({ error: "ملف غير صالح" }, { status: 500 });
  await prisma.auditLog.create({
    data: {
      action: "CITIZEN_IDENTITY_FILE_VIEWED",
      actorId: actor.id,
      actorEmail: actor.email,
      targetId: citizen.id,
      targetEmail: citizen.email,
      ipAddress: getClientIp(request),
      metadata: JSON.stringify({ side }),
    },
  });
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="identity-${side}"`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
