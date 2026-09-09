import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { verifyTrustedOrigin } from "@/lib/csrf";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { decodeTicketScanPayload } from "@/lib/ticket-scan-payload.mjs";
import { verifyScannedTicket } from "@/lib/ticket-verification.mjs";

export const dynamic = "force-dynamic";

// Read half of the door flow: turn whatever the camera decoded into a verdict
// plus the ticket's own details, and change nothing.
//
// Deliberately split from /api/admin/tickets/check-in. A ticket is اسمية —
// the printed instructions tell the holder to present ID alongside it — so the
// officer has to read the name off this response and compare it to the ID
// document *before* admitting anyone. Auto-admitting on scan would make that
// check impossible to perform. The officer then commits with the check-in
// route, which is idempotent.
export async function POST(request) {
  const actor = await getCurrentUser();
  if (!can(actor.role, "SCAN_EVENT_TICKETS")) {
    return NextResponse.json({ error: "غير مصرح بتدقيق التذاكر" }, { status: 403 });
  }
  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }
  const ip = getClientIp(request);
  // Looser than check-in: a camera fires this on every frame that decodes, and
  // a busy door reads far more tickets than it admits.
  if (!rateLimit(`ticket-scan:ip:${ip}`, 1200, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "محاولات كثيرة، يرجى المحاولة لاحقاً" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));

  // Two ways in: the QR payload, or the reference plus printed code typed by
  // hand when a ticket is too damaged to scan. Both land on the same checks.
  let referenceNo = "";
  let code = "";
  if (typeof body.payload === "string") {
    const decoded = decodeTicketScanPayload(body.payload.slice(0, 512));
    if (!decoded) {
      // Everything from "that was a WiFi QR" to "that was a forged payload"
      // collapses here, on purpose: the officer's next move is the same.
      return NextResponse.json({ result: "UNREADABLE", admissible: false }, { status: 422 });
    }
    referenceNo = decoded.referenceNo;
    code = decoded.code;
  } else {
    referenceNo = typeof body.referenceNo === "string" ? body.referenceNo.trim().slice(0, 64) : "";
    code = typeof body.code === "string" ? body.code.trim().toUpperCase().replace(/[\s-]/g, "").slice(0, 32) : "";
  }

  if (!referenceNo || !code) {
    return NextResponse.json({ error: "الرقم المرجعي ورمز التحقق مطلوبان" }, { status: 400 });
  }

  const booking = await prisma.eventBooking.findUnique({
    where: { referenceNo },
    select: {
      referenceNo: true,
      eventId: true,
      nationalIdHash: true,
      ticketSig: true,
      status: true,
      attendanceStatus: true,
      fullName: true,
      nationalIdLast4: true,
      checkedInAt: true,
      event: { select: { titleAr: true, startDate: true, location: true, governorate: true } },
    },
  });

  const { result, admissible } = verifyScannedTicket(booking, code);

  // Details only once the code has proven it belongs to this row. Before that
  // the request is indistinguishable from someone probing reference numbers,
  // and must not turn a guess into a citizen's name.
  const identified = !["NOT_FOUND", "CODE_MISMATCH", "TAMPERED"].includes(result);

  return NextResponse.json(
    {
      result,
      admissible,
      ticket: identified
        ? {
            referenceNo: booking.referenceNo,
            // Handed back so the officer's next tap can commit the check-in
            // without re-scanning; it is already on the ticket in their hand.
            code,
            fullName: booking.fullName,
            nationalIdLast4: booking.nationalIdLast4,
            status: booking.status,
            attendanceStatus: booking.attendanceStatus,
            checkedInAt: booking.checkedInAt,
            event: booking.event,
          }
        : null,
    },
    { status: admissible ? 200 : 422, headers: { "Cache-Control": "no-store" } },
  );
}
