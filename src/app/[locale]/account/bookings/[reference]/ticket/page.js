import BookingTicket from "@/components/citizen/BookingTicket";
import CitizenAccountNav from "@/components/citizen/CitizenAccountNav";
import CitizenPortalShell from "@/components/citizen/CitizenPortalShell";
import { getCurrentCitizen } from "@/lib/citizen-dal";
import { prisma } from "@/lib/prisma";
import { buildBookingTicketQr } from "@/lib/booking-ticket-pdf";
import { formatBookingTicketCode } from "@/lib/booking-ticket-code.mjs";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CitizenTicketPage({ params }) {
  const { locale, reference } = await params;
  const citizen = await getCurrentCitizen(locale);
  const booking = await prisma.eventBooking.findFirst({
    where: { citizenId: citizen.id, referenceNo: decodeURIComponent(reference) },
    select: {
      id: true,
      referenceNo: true,
      fullName: true,
      nationalIdLast4: true,
      status: true,
      attendanceStatus: true,
      ticketSig: true,
      event: { select: { titleAr: true, titleEn: true, startDate: true, location: true, locationEn: true } },
    },
  });
  if (!booking) notFound();

  // The QR is generated server-side: its payload is encrypted with a key
  // derived from BOOKING_TICKET_SECRET and the code comes from the stored
  // signature, neither of which should be reconstructable in the browser.
  let ticket = null;
  try {
    const { code, portalUrl, qrDataUri } = await buildBookingTicketQr(booking, locale);
    ticket = { code: formatBookingTicketCode(code), portalUrl, qrDataUri };
  } catch (error) {
    // A missing BOOKING_TICKET_SECRET or APP_BASE_URL must not take the whole
    // ticket page down — the citizen still needs their reference number.
    console.error("Booking ticket QR generation failed:", error);
  }

  const safe = {
    ...booking,
    ticketSig: undefined,
    event: { ...booking.event, startDate: booking.event.startDate.toISOString() },
  };

  return (
    <CitizenPortalShell locale={locale} activeStage={2}>
      <CitizenAccountNav locale={locale} />
      <BookingTicket booking={safe} ticket={ticket} locale={locale} />
    </CitizenPortalShell>
  );
}
