import BookingTicket from "@/components/citizen/BookingTicket";
import CitizenAccountNav from "@/components/citizen/CitizenAccountNav";
import CitizenPortalShell from "@/components/citizen/CitizenPortalShell";
import { getCurrentCitizen } from "@/lib/citizen-dal";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function CitizenTicketPage({ params }) { const { locale, reference } = await params; const citizen = await getCurrentCitizen(locale); const booking = await prisma.eventBooking.findFirst({ where: { citizenId: citizen.id, referenceNo: decodeURIComponent(reference) }, select: { referenceNo: true, fullName: true, nationalIdLast4: true, status: true, event: { select: { titleAr: true, titleEn: true, startDate: true, location: true, locationEn: true } } } }); if (!booking) notFound(); const safe = { ...booking, event: { ...booking.event, startDate: booking.event.startDate.toISOString() } }; return <CitizenPortalShell locale={locale} activeStage={2}><CitizenAccountNav locale={locale} /><BookingTicket booking={safe} locale={locale} /></CitizenPortalShell>; }
