import EventArtwork from "@/components/EventArtwork";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin } from "lucide-react";

import EventActions from "@/components/citizen/EventActions";
import EventBookingPanel from "@/components/citizen/EventBookingPanel";
import { getCurrentCitizenOptional } from "@/lib/citizen-dal";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_BADGE = {
  UPCOMING: ["قريباً", "Upcoming", "bg-[#EEF5F2] text-[#B79A58] border-[#B79A58]/20"],
  ONGOING: ["جارية الآن", "Happening now", "bg-amber-50 text-amber-900 border-amber-200"],
  COMPLETED: ["منتهية", "Completed", "bg-slate-100 text-slate-600 border-slate-200"],
  CANCELLED: ["ملغاة", "Cancelled", "bg-[#FCEDEC] text-red-700 border-red-200"],
};

function formatDate(value, locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : "en-GB", { dateStyle: "full" }).format(new Date(value));
}

function formatTime(value, locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : "en-GB", { timeStyle: "short" }).format(new Date(value));
}

export default async function PublicEventPage({ params }) {
  const { locale, id } = await params;
  const isAr = locale === "ar";

  const [event, optional] = await Promise.all([
    prisma.event.findFirst({
      where: { id, reviewStatus: "APPROVED" },
      select: {
        id: true,
        titleAr: true, titleEn: true,
        descriptionAr: true, descriptionEn: true,
        featuredImage: true,
        startDate: true, endDate: true,
        location: true, locationEn: true,
        governorate: true, governorateEn: true,
        status: true,
        capacity: true, bookedCount: true, bookingAvailability: true,
      },
    }),
    getCurrentCitizenOptional(),
  ]);
  if (!event) notFound();

  let citizen = null;
  if (optional?.citizenId) {
    const row = await prisma.citizen.findUnique({
      where: { id: optional.citizenId },
      select: { emailVerifiedAt: true, identityStatus: true },
    });
    if (row) citizen = { emailVerified: Boolean(row.emailVerifiedAt), identityStatus: row.identityStatus };
  }

  const related = await prisma.event.findMany({
    where: {
      reviewStatus: "APPROVED",
      status: { in: ["UPCOMING", "ONGOING"] },
      id: { not: event.id },
      startDate: { gte: new Date() },
    },
    orderBy: [{ startDate: "asc" }],
    take: 3,
    select: { id: true, titleAr: true, titleEn: true, featuredImage: true, startDate: true, location: true, locationEn: true },
  });

  const title = isAr ? event.titleAr : (event.titleEn || event.titleAr);
  const description = isAr ? event.descriptionAr : (event.descriptionEn || event.descriptionAr);
  const place = isAr ? event.location : (event.locationEn || event.location);
  const governorate = isAr ? event.governorate : (event.governorateEn || event.governorate);
  const [badgeAr, badgeEn, badgeTone] = STATUS_BADGE[event.status] || STATUS_BADGE.UPCOMING;

  return (
    <div className="min-h-screen bg-[#F8F7F2] pb-16 pt-[100px] lg:pt-[122px]" dir={isAr ? "rtl" : "ltr"}>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <nav className="flex items-center gap-2 text-xs md:text-sm text-slate-500 font-medium overflow-hidden whitespace-nowrap mb-4" aria-label="Breadcrumb">
            <Link href={`/${locale}`} className="hover:text-[#003F35] transition-colors shrink-0">
              {isAr ? "الرئيسية" : "Home"}
            </Link>
            <span className="text-slate-300 shrink-0">/</span>
            <Link href={`/${locale}/calendar`} className="hover:text-[#003F35] transition-colors shrink-0">
              {isAr ? "الروزنامة الثقافية" : "Calendar"}
            </Link>
            <span className="text-slate-300 shrink-0">/</span>
            <span className="text-[#B79A58] font-bold truncate max-w-[120px] md:max-w-none">
              {isAr ? "تفاصيل الفعالية" : "Event Details"}
            </span>
          </nav>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-block px-3 py-1 rounded-full bg-[#003F35]/5 text-[#003F35] text-xs font-bold border border-[#003F35]/10">
              {isAr ? "فعالية ثقافية" : "Cultural Event"}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${badgeTone}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              <span>{isAr ? badgeAr : badgeEn}</span>
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-[#153832] leading-tight sm:text-5xl font-qomra">{title}</h1>
        </header>

        {/* Portrait event poster */}
        <EventArtwork
          src={event.featuredImage}
          alt={title}
          preload
          sizes="(max-width: 639px) calc(100vw - 2rem), 540px"
          className="mx-auto mb-8 w-full max-w-[540px] rounded-3xl border border-[#DDE4E1]/80 shadow-[0_8px_24px_rgba(0,63,53,0.05)]"
        />

        {/* Unified Information Panel */}
        <section className="bg-white border border-[#DDE4E1] shadow-[0_8px_24px_rgba(0,63,53,0.04)] rounded-2xl p-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-12">
            {/* Date Row */}
            <div className="lg:col-span-4 flex gap-3.5 border-b sm:border-b-0 sm:border-e border-[#DDE4E1] pb-4 sm:pb-0 sm:pe-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF5F2] text-[#003F35]">
                <CalendarDays size={20} />
              </span>
              <div className="min-w-0">
                <span className="block text-[11px] font-bold text-[#60716D] uppercase tracking-wide">
                  {isAr ? "التاريخ" : "Date"}
                </span>
                <span className="block mt-1 text-sm font-bold text-[#153832] leading-relaxed">
                  {formatDate(event.startDate, locale)}
                </span>
              </div>
            </div>

            {/* Time Row */}
            <div className="lg:col-span-3 flex gap-3.5 border-b sm:border-b-0 sm:border-e border-[#DDE4E1] pb-4 sm:pb-0 sm:pe-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF5F2] text-[#003F35]">
                <Clock size={20} />
              </span>
              <div className="min-w-0">
                <span className="block text-[11px] font-bold text-[#60716D] uppercase tracking-wide">
                  {isAr ? "التوقيت" : "Time"}
                </span>
                <span className="block mt-1 text-sm font-bold text-[#153832] leading-relaxed">
                  {formatTime(event.startDate, locale)}
                </span>
              </div>
            </div>

            {/* Location Row */}
            <div className="lg:col-span-5 flex gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF5F2] text-[#003F35]">
                <MapPin size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold text-[#60716D] uppercase tracking-wide">
                  {isAr ? "مكان الفعالية" : "Venue"}
                </span>
                <span className="block mt-1 text-sm font-bold text-[#153832] leading-relaxed">
                  {place} {governorate && `، ${governorate}`}
                </span>
              </div>
            </div>
          </div>
        </section>

        <main className="mt-10 grid gap-10 lg:grid-cols-[1fr_370px]">
          {/* Right Content Area */}
          <div className="min-w-0">
            {description && (
              <article>
                <h2 className="text-xl font-bold text-[#153832] font-qomra">{isAr ? "عن الفعالية" : "About the Event"}</h2>
                <div className="mt-2 h-0.5 w-14 rounded-full bg-[#B79A58]" />
                <div
                  className="mt-6 text-[15px] sm:text-[16px] leading-[1.95] text-slate-700 font-normal space-y-4"
                  dangerouslySetInnerHTML={{ __html: description }}
                />

                <div className="mt-10 pt-6 border-t border-[#DDE4E1]">
                  <EventActions title={title} icsHref={`/api/events/${event.id}/calendar.ics`} locale={locale} />
                </div>
              </article>
            )}
          </div>

          {/* Left Sidebar (Sticky Desktop) */}
          <aside className="lg:sticky lg:top-36 lg:h-fit">
            <EventBookingPanel eventId={event.id} locale={locale} citizen={citizen} />
          </aside>
        </main>

        {related.length > 0 && (
          <section className="mt-16 pt-12 border-t border-[#DDE4E1]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-[#153832] font-qomra">
                  {isAr ? "فعاليات ثقافية أخرى قد تهمك" : "Other Upcoming Events"}
                </h2>
                <div className="mt-2 h-0.5 w-14 rounded-full bg-[#B79A58]" />
              </div>
              <Link
                href={`/${locale}/calendar`}
                className="text-xs font-bold text-[#003F35] hover:text-[#B79A58] transition-colors border-b border-transparent hover:border-current"
              >
                {isAr ? "عرض جميع الفعاليات ←" : "View all events →"}
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/${locale}/events/${item.id}`}
                  className="group flex flex-col bg-white rounded-2xl border border-[#DDE4E1]/80 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 h-full"
                >
                  <EventArtwork
                    src={item.featuredImage}
                    alt={isAr ? item.titleAr : (item.titleEn || item.titleAr)}
                    sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc(50vw - 2.25rem), (max-width: 1151px) calc(33.333vw - 2rem), 352px"
                    className="w-full"
                  />
                  <div className="p-4 flex flex-col grow">
                    <span className="text-[10px] font-bold text-[#B79A58]">
                      {formatDate(item.startDate, locale)}
                    </span>
                    <h4 className="mt-1 text-sm font-bold text-slate-800 line-clamp-2 leading-relaxed group-hover:text-[#B79A58] transition-colors mb-3 flex-grow">
                      {isAr ? item.titleAr : (item.titleEn || item.titleAr)}
                    </h4>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                      <span className="text-xs text-slate-400 font-medium truncate max-w-[200px]">
                        {isAr ? item.location : (item.locationEn || item.location)}
                      </span>
                      <span className="text-xs font-bold text-[#003F35] shrink-0">
                        {isAr ? "التفاصيل ←" : "Details →"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
