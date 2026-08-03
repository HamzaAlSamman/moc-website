import CitizenAccountNav from "@/components/citizen/CitizenAccountNav";
import CitizenBookings from "@/components/citizen/CitizenBookings";
import CitizenPortalShell from "@/components/citizen/CitizenPortalShell";
import { getCurrentCitizen } from "@/lib/citizen-dal";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function CitizenBookingsPage({ params }) { const { locale } = await params; const citizen = await getCurrentCitizen(locale); const bookings = await prisma.eventBooking.findMany({ where: { citizenId: citizen.id }, select: { id: true, referenceNo: true, status: true, attendanceStatus: true, cancelledAt: true, createdAt: true, event: { select: { id: true, titleAr: true, titleEn: true, startDate: true, location: true, locationEn: true, status: true } } }, orderBy: { createdAt: "desc" }, take: 100 }); const safe = bookings.map((booking) => ({ ...booking, createdAt: booking.createdAt.toISOString(), cancelledAt: booking.cancelledAt?.toISOString() || null, event: { ...booking.event, startDate: booking.event.startDate.toISOString() } })); return <CitizenPortalShell locale={locale} activeStage={2}><CitizenAccountNav locale={locale} /><header className="mb-6"><p className="text-xs font-black tracking-[0.18em] text-[#A48E68]">{locale === "ar" ? "سجل الحضور الثقافي" : "Cultural attendance record"}</p><h2 className="mt-2 text-3xl font-black text-[#002723]">{locale === "ar" ? "حجوزاتي" : "My bookings"}</h2></header><CitizenBookings initialBookings={safe} locale={locale} /></CitizenPortalShell>; }
