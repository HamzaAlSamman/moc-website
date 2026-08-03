import Link from "next/link";
import { BadgeCheck, IdCard, TicketCheck } from "lucide-react";

const copy = {
  ar: {
    eyebrow: "بوابة المواطن الثقافية",
    title: "مساحتك للفعاليات الثقافية",
    description: "حساب واحد لتوثيق الهوية، حجز المقاعد، والاحتفاظ بتذاكرك الرسمية.",
    stages: ["تأكيد البريد", "مراجعة الهوية", "الحجز والتذكرة"],
    calendar: "العودة إلى الروزنامة",
  },
  en: {
    eyebrow: "Citizen cultural portal",
    title: "Your space for cultural events",
    description: "One account for identity verification, seat booking, and official tickets.",
    stages: ["Verify email", "Review identity", "Book and attend"],
    calendar: "Back to calendar",
  },
};

export default function CitizenPortalShell({ locale = "ar", activeStage = 0, children }) {
  const t = copy[locale] || copy.ar;
  const icons = [BadgeCheck, IdCard, TicketCheck];
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f8f5] pt-[100px] lg:pt-[122px]" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "url(/svg/unisco_pattern.svg)", backgroundSize: "150px" }} />
      <div className="pointer-events-none absolute -top-28 end-[-8rem] h-80 w-80 rounded-full bg-[#003D33]/8 blur-3xl" />
      <main className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12 lg:py-14">
        <aside className="relative overflow-hidden rounded-[2rem] bg-[#003D33] p-7 text-white shadow-xl sm:p-9 lg:sticky lg:top-32 lg:self-start">
          <div className="pointer-events-none absolute inset-0 opacity-[0.09]" style={{ backgroundImage: "url(/svg/pattern-hex.svg)", backgroundSize: "280px" }} />
          <div className="relative">
            <span className="inline-flex rounded-full border border-[#A48E68]/45 bg-white/5 px-3 py-1 text-xs font-bold text-[#dac9a8]">{t.eyebrow}</span>
            <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">{t.title}</h1>
            <p className="mt-3 max-w-md text-sm leading-7 text-white/70">{t.description}</p>
            <ol className="mt-9 space-y-3" aria-label={locale === "ar" ? "مراحل تفعيل الحساب" : "Account activation stages"}>
              {t.stages.map((label, index) => {
                const Icon = icons[index];
                const active = index <= activeStage;
                return (
                  <li key={label} className={`flex min-h-14 items-center gap-4 rounded-2xl border px-4 transition ${active ? "border-[#A48E68]/50 bg-white/10" : "border-white/10 text-white/45"}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${active ? "bg-[#A48E68] text-[#003D33]" : "bg-white/10"}`}><Icon size={18} aria-hidden="true" /></span>
                    <span className="font-bold">{label}</span>
                  </li>
                );
              })}
            </ol>
            <Link href={`/${locale}/calendar`} className="mt-8 inline-flex min-h-11 items-center rounded-xl border border-white/20 px-4 text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A48E68]">
              {t.calendar}
            </Link>
          </div>
        </aside>
        <section className="self-start rounded-[2rem] border border-[#A48E68]/20 bg-white p-5 shadow-[0_18px_60px_rgba(0,61,51,0.09)] sm:p-8 lg:p-10">
          {children}
        </section>
      </main>
    </div>
  );
}
