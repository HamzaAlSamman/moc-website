import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { readComplaintFile } from "@/lib/complaint-storage.mjs";

const STORAGE_SUBDIR = "cooperation-messages";

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!can(user.role, "REVIEW_COOPERATION_MESSAGES")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id, index } = await params;
  const message = await prisma.cooperationMessage.findUnique({ where: { id }, select: { attachments: true } });
  const attachments = Array.isArray(message?.attachments) ? message.attachments : [];
  const attachment = attachments[Number(index)];
  if (!attachment?.storageKey) {
    return NextResponse.json({ error: "المرفق غير موجود" }, { status: 404 });
  }
  try {
    const bytes = await readComplaintFile(STORAGE_SUBDIR, attachment.storageKey);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Cooperation message attachment read failed:", error);
    return NextResponse.json({ error: "تعذر تحميل المرفق" }, { status: 404 });
  }
}
