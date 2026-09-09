import { NextResponse } from "next/server";

import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { verifyTrustedOrigin } from "@/lib/csrf";
import { processNotificationOutbox, retryOutboxRow } from "@/lib/notification-outbox";

export const dynamic = "force-dynamic";

// Bounded on purpose. A booking confirmation renders a ticket PDF through
// Chromium, so a full 50-row batch can run into minutes and time the request
// out; ten keeps a manual flush inside a request's lifetime, and the operator
// can press again. The cron worker still drains the rest at its own pace.
const MANUAL_RUN_BATCH = 10;

export async function POST(request) {
  const session = await verifySession();
  if (!can(session.role, "MANAGE_EMAIL_OUTBOX")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  if (body.action === "retry") {
    if (typeof body.id !== "string" || !body.id) {
      return NextResponse.json({ error: "معرّف الرسالة مطلوب" }, { status: 400 });
    }
    const { retried, result } = await retryOutboxRow(body.id);
    if (!retried) {
      return NextResponse.json(
        { error: "لا يمكن إعادة إرسال هذه الرسالة — قد تكون أُرسلت أصلاً أو قيد الإرسال الآن", code: "NOT_RETRYABLE" },
        { status: 409 },
      );
    }
    const row = await prisma.notificationOutbox.findUnique({
      where: { id: body.id },
      select: { id: true, status: true, attempts: true, lastError: true, sentAt: true, updatedAt: true },
    });
    return NextResponse.json({ result, row }, { headers: { "Cache-Control": "no-store" } });
  }

  if (body.action === "run") {
    const result = await processNotificationOutbox({ batchSize: MANUAL_RUN_BATCH });
    return NextResponse.json({ result }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
}
