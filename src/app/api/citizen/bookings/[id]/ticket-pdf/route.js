import { NextResponse } from "next/server";

import { getCitizenSession } from "@/lib/citizen-session";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { generateBookingTicketPdf } from "@/lib/booking-ticket-pdf";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const session = await getCitizenSession();
  if (!session?.citizenId) {
    return NextResponse.json({ error: "يلزم تسجيل الدخول", code: "AUTH_REQUIRED" }, { status: 401 });
  }
  // Rendering a PDF spawns a Chromium process, so this endpoint is capped
  // harder than the JSON booking routes.
  const ip = getClientIp(request);
  if (
    !rateLimit(`citizen-ticket-pdf:ip:${ip}`, 60, 60 * 60 * 1000)
    || !rateLimit(`citizen-ticket-pdf:citizen:${session.citizenId}`, 30, 60 * 60 * 1000)
  ) {
    return NextResponse.json({ error: "محاولات كثيرة، يرجى المحاولة لاحقاً" }, { status: 429 });
  }

  const { id } = await params;
  // Scoped to the signed-in citizen: a booking id is not an access token.
  const booking = await prisma.eventBooking.findFirst({
    where: { id, citizenId: session.citizenId },
    select: {
      referenceNo: true,
      fullName: true,
      nationalIdLast4: true,
      status: true,
      attendanceStatus: true,
      ticketSig: true,
      event: {
        select: { titleAr: true, startDate: true, location: true, governorate: true },
      },
    },
  });
  if (!booking) return NextResponse.json({ error: "الحجز غير موجود" }, { status: 404 });
  if (booking.status === "CANCELLED") {
    return NextResponse.json({ error: "الحجز ملغى ولا يمكن إصدار تذكرة له" }, { status: 409 });
  }

  try {
    const pdf = await generateBookingTicketPdf(booking);
    const filename = `ticket-${booking.referenceNo}.pdf`;
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.length),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    // نبقي الرسالة المعروضة للمواطن عامة — تفاصيل إعدادات الخادم ليست شأنه
    // ولا يجوز تسريبها — لكن نُرفق `code` يميّز عطل تهيئة الخادم عن غيره،
    // ونطبع في السجل ما يكفي لإصلاحه دون تخمين. رسالة "تعذر إصدار ملف
    // التذكرة" وحدها لا تدل على أن Chromium غير مثبّت أو أن APP_BASE_URL
    // غير مضبوط، وهو ما جعل تشخيص العطل يستغرق وقتاً طويلاً.
    const code = error?.code === "CHROMIUM_MISSING" ? "PDF_ENGINE_UNAVAILABLE"
      : /APP_BASE_URL/.test(error?.message || "") ? "APP_BASE_URL_MISSING"
      : "PDF_RENDER_FAILED";

    console.error(
      `Booking ticket PDF generation failed [${code}] for ${booking.referenceNo}:`,
      error,
    );
    if (code !== "PDF_RENDER_FAILED") {
      console.error(
        "  ↳ إعداد ناقص على الخادم. راجع قسم «تذاكر الفعاليات وملفات PDF» في AGENTS.md.",
      );
    }

    return NextResponse.json({ error: "تعذر إصدار ملف التذكرة", code }, { status: 500 });
  }
}
