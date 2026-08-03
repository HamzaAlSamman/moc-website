import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { isOutboxCronAuthorized } from "@/lib/notification-outbox-core.mjs";
import { processNotificationOutbox, runCitizenBookingMaintenance } from "@/lib/notification-outbox";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const secret = process.env.OUTBOX_CRON_SECRET;
  try {
    if (!isOutboxCronAuthorized(request.headers.get("authorization"), secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
  } catch {
    return NextResponse.json({ error: "Outbox worker is not configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const workerId = `plesk-${randomUUID()}`;
  const outbox = await processNotificationOutbox({ workerId });
  const maintenance = await runCitizenBookingMaintenance();
  if (maintenance.reconciliation.drifts.length) {
    console.warn("Booking counter drift detected", maintenance.reconciliation.drifts.map(({ eventId, stored, actual }) => ({ eventId, stored, actual })));
  }
  return NextResponse.json({ ok: true, outbox, maintenance }, { headers: { "Cache-Control": "no-store" } });
}
