"use client";

import React, { use, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DecorativeCorners from "../../../components/DecorativeCorners";
import SubpageHero from "../../../components/SubpageHero";

// Secret unlock gesture for "coming soon" service cards: tapping a card this
// many times within the timeout navigates straight to it (the route's own
// password gate still applies — this just saves testers from typing the URL).
const SECRET_TAP_COUNT = 10;
const SECRET_TAP_TIMEOUT_MS = 1500;

/* ─── Service definitions ─── */
const SERVICES = [
  /* ── 1. Event Submission ── ACTIVE */
  {
    id: "event-submission",
    status: "active",
    href: (locale) => `/${locale}/services/submit-event`,
    color: "#1C665A",
    colorLight: "#1C665A",
    badge: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        <path d="M12 12v4m0 0l-2-2m2 2l2-2" />
      </svg>
    ),
    titleAr: "طلب تقديم إقامة فعالية",
    titleEn: "Event Submission",
    descAr: "قدّم طلب إقامة فعاليتك الثقافية لإضافتها إلى الروزنامة الثقافية بعد مراجعتها وتدقيقها من قِبل مديرية إدارة الفعاليات والمهرجانات.",
    descEn: "Propose your cultural event to be added to the national calendar after review by the Events Directorate.",
    featuresAr: [
      "متاح للجمهور والمراكز والجمعيات الأهلية والفرق الفنية",
      "استمارة رسمية وفق معايير وزارة الثقافة",
      "متابعة حالة الطلب عبر لوحة التحكم",
    ],
    featuresEn: [
      "Available for public, centers, NGOs, and artistic troupes",
      "Official form matching Ministry of Culture standards",
      "Track submission status via dashboard",
    ],
  },
  /* ── 2. Copyright ── COMING SOON (password-gated for internal testing) */
  {
    id: "copyright",
    status: "soon",
    href: (locale) => `/${locale}/services/copyright`,
    color: "#B25329",
    colorLight: "#B25329",
    badge: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <circle cx="12" cy="12" r="9" />
        <path d="M14.5 9.5a4 4 0 100 5M10 12h4" />
      </svg>
    ),
    titleAr: "حقوق المؤلف والملكية الفكرية",
    titleEn: "Copyright & Intellectual Property",
    descAr: "تسجيل حقوق المؤلف والملكية الفكرية للأعمال الأدبية والفنية والمسرحية والموسيقية، وإصدار شهادات الحماية الرسمية.",
    descEn: "Register copyrights and intellectual property rights for literary, artistic, theatrical and musical works.",
    featuresAr: [
      "تسجيل الأعمال الأدبية والفنية والموسيقية",
      "إصدار شهادات حماية رسمية",
      "الاستعلام عن حالة الطلبات",
    ],
    featuresEn: [
      "Register literary, artistic and musical works",
      "Issue official protection certificates",
      "Query submission status online",
    ],
  },
  /* ── Legal License Applications ── INTERNAL TESTING */
  {
    id: "legal-licenses",
    status: "soon",
    href: (locale) => `/${locale}/services/legal-licenses`,
    color: "#5D4A7D",
    colorLight: "#5D4A7D",
    badge: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M6 3h9l3 3v15H6z" /><path d="M15 3v4h4M9 11h6M9 15h6M9 19h4" />
      </svg>
    ),
    titleAr: "طلبات التراخيص القانونية",
    titleEn: "Legal License Applications",
    descAr: "تقديم ومتابعة طلبات تراخيص الجهات والأنشطة الثقافية مع وثائق المؤسسين وسير اعتماد قانوني موثّق.",
    descEn: "Apply for and track licenses for cultural entities and activities through a documented legal review workflow.",
    featuresAr: ["عشرة أنواع من التراخيص الثقافية", "حفظ المسودة ومتابعتها برمز سري", "رفع آمن للوثائق خارج التخزين العام"],
    featuresEn: ["Ten cultural license types", "Secure draft saving and tracking", "Private protected document storage"],
  },  /* ── 3. International Cooperation Contact ── ACTIVE */
  {
    id: "international-cooperation",
    status: "active",
    href: (locale) => `/${locale}/services/international-cooperation`,
    color: "#2563A6",
    colorLight: "#2563A6",
    badge: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
      </svg>
    ),
    titleAr: "التواصل مع مديرية التعاون الدولي",
    titleEn: "International Cooperation Directorate",
    descAr: "قناة رسمية للجهات الحكومية والمنظمات والجمعيات الأهلية للتواصل مع مديرية التعاون الدولي وإرسال الشكاوى والاقتراحات والشكر.",
    descEn: "An official channel for government entities, organizations and civil associations to reach the International Cooperation Directorate.",
    featuresAr: [
      "مخصّصة للجهات الحكومية والمنظمات والجمعيات الأهلية",
      "إرسال شكوى أو اقتراح أو رسالة شكر",
      "مدة الرد المتوقعة من يومين إلى أسبوع عمل",
    ],
    featuresEn: [
      "For government entities, organizations and civil associations",
      "Send a complaint, suggestion, or appreciation",
      "Expected response within two days to a week",
    ],
  },
  /* ── 4. Internal Oversight Complaints ── ACTIVE */
  {
    id: "internal-oversight",
    status: "active",
    href: (locale) => `/${locale}/services/internal-oversight`,
    color: "#8B2635",
    colorLight: "#8B2635",
    badge: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3z" />
        <path d="M9.5 12l2 2 3.5-4" />
      </svg>
    ),
    titleAr: "شكاوى مديرية الرقابة الداخلية",
    titleEn: "Internal Oversight Complaints",
    descAr: "قناة رسمية لتقديم الشكاوى المتعلقة بأداء العاملين أو الجهات التابعة لوزارة الثقافة، متاحة لكل المواطنين مع إمكانية تقديم الشكوى دون الكشف عن الهوية.",
    descEn: "An official channel to file complaints about staff or entities under the Ministry of Culture, open to everyone with an anonymous option.",
    featuresAr: [
      "متاحة لأي شخص بدون شرط أو صفة معينة",
      "يمكن تقديم الشكوى دون ذكر الاسم أو أي معلومة شخصية",
      "مدة المعالجة المتوقعة 3 أيام عمل",
    ],
    featuresEn: [
      "Open to anyone, no specific capacity required",
      "Can be submitted fully anonymously",
      "Expected processing time is 3 working days",
    ],
  },
];

/* ─── Status meta ─── */
const STATUS = {
  active: { labelAr: "متاح الآن", labelEn: "Available Now", cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  soon:   { labelAr: "قريباً",    labelEn: "Coming Soon",    cls: "bg-[#b9a779]/15 text-[#b9a779] border-[#b9a779]/30" },
};

/* ─── Page ─── */
export default function ServicesPage(props) {
  const params = use(props.params);
  const locale = params.locale || "ar";
  const isRtl = locale === "ar";
  const router = useRouter();

  const active = SERVICES.filter((s) => s.status === "active");
  const soon   = SERVICES.filter((s) => s.status === "soon");

  // Silent gesture — no visible feedback, just a ref-based counter so it
  // works regardless of React's render/batching timing.
  const tapRefs = useRef({});
  const tapTimers = useRef({});

  function handleSecretTap(service) {
    const id = service.id;
    const nextCount = (tapRefs.current[id] || 0) + 1;
    tapRefs.current[id] = nextCount;

    clearTimeout(tapTimers.current[id]);

    if (nextCount >= SECRET_TAP_COUNT) {
      tapRefs.current[id] = 0;
      router.push(service.href(locale));
      return;
    }

    tapTimers.current[id] = setTimeout(() => {
      tapRefs.current[id] = 0;
    }, SECRET_TAP_TIMEOUT_MS);
  }

  return (
    <div
      className="relative flex flex-col w-full min-h-screen bg-[#F8F3EC] pt-[84px] md:pt-[88px] lg:pt-[104px]"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* ── Hero ── */}
      <SubpageHero
        title={isRtl ? "الخدمات الإلكترونية" : "Digital Services"}
        subtitle={isRtl ? "وزارة الثقافة السورية" : "Syrian Ministry of Culture"}
        description={
          isRtl
            ? "بوابتك الرسمية للخدمات الثقافية والإدارية المقدّمة من وزارة الثقافة السورية للأفراد والمؤسسات والجهات الأهلية."
            : "Your official gateway to cultural and administrative services from the Syrian Ministry of Culture."
        }
        isRtl={isRtl}
      >
        {/* Stats */}
        <div className="flex items-center gap-8 mt-4">
          {[
            { num: active.length, label: isRtl ? "خدمات متاحة" : "Available Services" },
            { num: soon.length,   label: isRtl ? "خدمات قادمة" : "Upcoming Services" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-black text-[#b9a779] font-qomra">{s.num}</p>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </SubpageHero>

      {/* ── Main ── */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-12 xl:py-16 w-full flex-grow">

        {/* ═══ Active Services ═══ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-[#054239] font-extrabold text-xl font-qomra">
              {isRtl ? "الخدمات المتاحة الآن" : "Available Now"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {active.map((service) => {
              const href = service.href(locale);
              return (
                <Link
                  key={service.id}
                  href={href}
                  className="group relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#b9a779]/30 transition-all duration-300 overflow-hidden flex flex-col"
                >
                  <DecorativeCorners />

                  {/* Top accent */}
                  <div className="h-1.5 w-full" style={{ background: service.color }} />

                  <div className="p-6 flex flex-col flex-grow gap-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                        style={{ background: `${service.color}18`, color: service.color, boxShadow: `0 0 0 1px ${service.color}30` }}
                      >
                        {service.icon}
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS[service.status].cls}`}>
                        {isRtl ? STATUS[service.status].labelAr : STATUS[service.status].labelEn}
                      </span>
                    </div>

                    {/* Title + desc */}
                    <div className="flex-grow">
                      <h3 className="text-[#054239] font-extrabold text-lg leading-snug mb-2 group-hover:text-[#1C665A] transition-colors font-qomra">
                        {isRtl ? service.titleAr : service.titleEn}
                      </h3>
                      <p className="text-slate-500 text-sm leading-relaxed font-cairo">
                        {isRtl ? service.descAr : service.descEn}
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-1.5 border-t border-slate-100 pt-4">
                      {(isRtl ? service.featuresAr : service.featuresEn).map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                          <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: `${service.color}18`, color: service.color }}>
                            <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5">
                              <path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7-1-1z"/>
                            </svg>
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <div
                      className="flex items-center gap-2 text-sm font-extrabold mt-1 transition-all duration-300"
                      style={{ color: service.color }}
                    >
                      <span>{isRtl ? "البدء بالتقديم" : "Start Now"}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        strokeWidth={2.5} stroke="currentColor"
                        className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1 rtl:rotate-0 ltr:rotate-180 ltr:group-hover:translate-x-1"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ═══ Coming Soon ═══ */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#b9a779]" />
            <h2 className="text-[#054239] font-extrabold text-xl font-qomra">
              {isRtl ? "خدمات قادمة" : "Coming Soon"}
            </h2>
            <span className="text-xs font-bold bg-[#b9a779]/10 text-[#b9a779] border border-[#b9a779]/20 px-2.5 py-0.5 rounded-full font-qomra">
              {soon.length} {isRtl ? "خدمة" : "services"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {soon.map((service) => (
              <div
                key={service.id}
                onClick={() => handleSecretTap(service)}
                className="group relative bg-white/60 rounded-3xl border border-slate-100 overflow-hidden flex flex-col opacity-75 select-none"
              >
                {/* Coming soon ribbon */}
                <div className="absolute top-3 end-3 z-10">
                  <span className="text-[10px] font-black bg-[#b9a779]/15 text-[#b9a779] border border-[#b9a779]/30 px-2.5 py-1 rounded-full font-qomra">
                    {isRtl ? "قريباً" : "Soon"}
                  </span>
                </div>

                {/* Top accent — muted */}
                <div className="h-1 w-full opacity-40" style={{ background: service.color }} />

                <div className="p-5 flex flex-col gap-4 flex-grow">
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 opacity-70"
                    style={{ background: `${service.color}12`, color: service.color }}
                  >
                    {service.icon}
                  </div>

                  {/* Title + desc */}
                  <div className="flex-grow">
                    <h3 className="text-slate-600 font-extrabold text-base leading-snug mb-1.5 font-qomra">
                      {isRtl ? service.titleAr : service.titleEn}
                    </h3>
                    <p className="text-slate-400 text-xs leading-relaxed line-clamp-3 font-cairo">
                      {isRtl ? service.descAr : service.descEn}
                    </p>
                  </div>

                  {/* Features — blurred look */}
                  <ul className="space-y-1 border-t border-slate-100 pt-3">
                    {(isRtl ? service.featuresAr : service.featuresEn).slice(0, 2).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold">
                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: `${service.color}20` }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

        </div>

      </main>
    </div>
  );
}
