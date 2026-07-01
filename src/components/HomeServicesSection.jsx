"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarPlus, Globe2, ShieldCheck } from "lucide-react";

const SERVICES = [
  {
    id: "internal-oversight",
    featured: true,
    href: (locale) => `/${locale}/services/internal-oversight`,
    icon: ShieldCheck,
    color: "#8B2635",
    titleAr: "تقديم شكوى لمديرية الرقابة الداخلية",
    titleEn: "Internal Oversight Complaint",
    descAr:
      "قناة رسمية وآمنة لتقديم الشكاوى المتعلقة بأداء العاملين أو الجهات التابعة لوزارة الثقافة، مع إمكانية التقديم دون الكشف عن الهوية.",
    descEn:
      "A secure official channel for complaints related to staff or entities under the Ministry of Culture, with an anonymous submission option.",
    metaAr: "متاحة للمواطنين",
    metaEn: "Available to citizens",
  },
  {
    id: "event-submission",
    featured: false,
    href: (locale) => `/${locale}/services/submit-event`,
    icon: CalendarPlus,
    color: "#1C665A",
    titleAr: "طلب تقديم إقامة فعالية",
    titleEn: "Event Submission Request",
    descAr:
      "قدّم طلب إقامة فعالية ثقافية لإضافتها إلى الروزنامة الثقافية بعد مراجعتها وتدقيقها من الجهات المختصة.",
    descEn:
      "Submit a cultural event request for review and possible inclusion in the cultural calendar.",
    metaAr: "للأفراد والجهات الثقافية",
    metaEn: "For individuals and cultural entities",
  },
  {
    id: "international-cooperation",
    featured: false,
    href: (locale) => `/${locale}/services/international-cooperation`,
    icon: Globe2,
    color: "#2563A6",
    titleAr: "التواصل مع مديرية التعاون الدولي",
    titleEn: "International Cooperation Directorate",
    descAr:
      "نافذة رسمية للجهات الحكومية والمنظمات والجمعيات الأهلية للتواصل مع مديرية التعاون الدولي وإرسال الطلبات والمقترحات.",
    descEn:
      "An official channel for government entities, organizations, and civil associations to contact the International Cooperation Directorate.",
    metaAr: "للجهات والمنظمات",
    metaEn: "For entities and organizations",
  },
];

export default function HomeServicesSection({ locale = "ar" }) {
  const isRtl = locale !== "en";
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <section
      className="relative w-full overflow-hidden bg-[#F8F3EC] py-12 sm:py-14 lg:py-16"
      dir={isRtl ? "rtl" : "ltr"}
      aria-labelledby="home-services-heading"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 2xl:px-12">
        <div className="mb-7 flex flex-col gap-4 md:mb-9 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="mb-3 inline-flex items-center gap-2 text-xs font-extrabold text-[#A48E68]">
              <span className="h-2 w-2 rounded-full bg-[#A48E68]" />
              {isRtl ? "بوابة الخدمات" : "Services Portal"}
            </span>
            <h2
              id="home-services-heading"
              className="font-qomra text-2xl font-black leading-tight text-[#054239] sm:text-3xl lg:text-4xl"
            >
              {isRtl ? "الخدمات الإلكترونية" : "Digital Services"}
            </h2>
            <p className="mt-3 text-sm font-medium leading-7 text-slate-600 sm:text-base">
              {isRtl
                ? "تتيح وزارة الثقافة عدداً من الخدمات الإلكترونية لتسهيل التواصل وتقديم الطلبات عبر قنوات رسمية واضحة."
                : "The Ministry of Culture provides digital services that make official communication and request submission clearer and easier."}
            </p>
          </div>

          <Link
            href={`/${locale}/services`}
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full border border-[#054239]/15 bg-white px-5 text-sm font-extrabold text-[#054239] shadow-sm transition hover:border-[#A48E68]/50 hover:text-[#8B2635]"
          >
            {isRtl ? "عرض جميع الخدمات" : "View All Services"}
            <ArrowIcon className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-5">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            const href = service.href(locale);

            return (
              <Link
                key={service.id}
                href={href}
                className={`group relative flex min-h-[250px] flex-col overflow-hidden rounded-3xl border bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6 ${
                  service.featured
                    ? "border-[#8B2635]/25 ring-1 ring-[#8B2635]/10"
                    : "border-slate-100 hover:border-[#A48E68]/30"
                }`}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ backgroundColor: service.color }}
                />

                {service.featured && (
                  <span className="absolute top-4 end-4 rounded-full bg-[#8B2635]/10 px-3 py-1 text-[11px] font-extrabold text-[#8B2635]">
                    {isRtl ? "خدمة ذات أولوية" : "Priority Service"}
                  </span>
                )}

                <div
                  className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl transition group-hover:scale-105"
                  style={{
                    backgroundColor: `${service.color}14`,
                    color: service.color,
                    boxShadow: `0 0 0 1px ${service.color}24`,
                  }}
                >
                  <Icon className="h-7 w-7" strokeWidth={1.8} />
                </div>

                <div className="flex flex-1 flex-col">
                  <p className="mb-2 text-xs font-extrabold text-[#A48E68]">
                    {isRtl ? service.metaAr : service.metaEn}
                  </p>
                  <h3 className="font-qomra text-lg font-black leading-snug text-[#054239] sm:text-xl">
                    {isRtl ? service.titleAr : service.titleEn}
                  </h3>
                  <p className="mt-3 flex-1 text-sm font-medium leading-7 text-slate-600">
                    {isRtl ? service.descAr : service.descEn}
                  </p>
                  <span
                    className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold"
                    style={{ color: service.color }}
                  >
                    {isRtl ? "الدخول إلى الخدمة" : "Open Service"}
                    <ArrowIcon className="h-4 w-4 transition group-hover:-translate-x-1 ltr:group-hover:translate-x-1" strokeWidth={2.5} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
