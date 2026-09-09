import Link from "next/link";
import { BadgeCheck, IdCard, TicketCheck } from "lucide-react";

const copy = {
  ar: {
    eyebrow: "بوابة المواطن الرقمية",
    title: "بوابتكم للخدمات والفعاليات الثقافية",
    description: "حساب موحد يتيح لكم حجز التذاكر الرسمية، وحفظ حجوزات الفعاليات، ومتابعة جميع الخدمات الإلكترونية بسهولة.",
    stages: [
      "تفعيل سريع للحساب بالبريد الإلكتروني",
      "استلام التذاكر الرقمية فوراً",
      "إدارة الحجوزات والمعاملات في مكان واحد"
    ],
    calendar: "استكشاف روزنامة الفعاليات",
  },
  en: {
    eyebrow: "Digital Citizen Portal",
    title: "Your Gateway to Cultural Services & Events",
    description: "A unified account allowing you to book official tickets, save event bookings, and manage all digital services easily.",
    stages: [
      "Fast account activation via email",
      "Instant digital ticket delivery",
      "Manage bookings and requests in one place"
    ],
    calendar: "Explore Events Calendar",
  },
};

export default function CitizenPortalShell({ locale = "ar", activeStage = 0, children }) {
  const t = copy[locale] || copy.ar;
  const icons = [BadgeCheck, IdCard, TicketCheck];
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f8f5] pt-[120px] lg:pt-[140px]" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "url(/svg/unisco_pattern.svg)", backgroundSize: "150px", opacity: 0.01 }} />
      <div className="pointer-events-none absolute -top-28 end-[-8rem] h-80 w-80 rounded-full bg-[#003D33]/6 blur-3xl" />
      <main className="relative mx-auto grid w-full max-w-[1240px] items-stretch gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[44fr_56fr] lg:gap-10 lg:py-8">
        <aside className="order-2 relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] bg-[#003D33] p-7 text-white shadow-xl sm:p-9 lg:order-1">
          <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(/svg/pattern-hex.svg)", backgroundSize: "280px" }} />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <span className="inline-flex rounded-full border border-[#A48E68]/45 bg-white/5 px-3 py-1 text-xs font-bold text-[#dac9a8]">{t.eyebrow}</span>
              <h1 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">{t.title}</h1>
              <p className="mt-2.5 max-w-md text-xs sm:text-sm leading-6 text-white/75">{t.description}</p>
              <ul className="mt-8 space-y-3" aria-label={locale === "ar" ? "معلومات الحساب" : "Account information"}>
                {t.stages.map((label, index) => {
                  const Icon = icons[index];
                  return (
                    <li key={label} className="flex items-center gap-3 text-white/90">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#A48E68] text-[#003D33]">
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <span className="text-xs sm:text-sm font-bold">{label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="mt-8 pt-4">
              <Link href={`/${locale}/calendar`} className="inline-flex min-h-10 items-center rounded-xl border border-white/20 px-5 text-xs sm:text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A48E68]">
                {t.calendar}
              </Link>
            </div>
          </div>
        </aside>
        <section className="order-1 flex flex-col justify-center rounded-[2.5rem] border border-[#A48E68]/20 bg-white p-7 shadow-[0_18px_60px_rgba(0,61,51,0.08)] sm:p-9 lg:order-2">
          {children}
        </section>
      </main>
    </div>
  );
}
