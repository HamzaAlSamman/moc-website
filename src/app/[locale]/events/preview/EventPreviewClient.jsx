"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Share2,
  CalendarPlus,
  AlertCircle,
  Loader2,
  ExternalLink,
  Accessibility,
  Phone,
  Mail,
  XCircle,
  CalendarX,
  Check
} from "lucide-react";
import EventArtwork from "@/components/EventArtwork";

// Helper for Arabic and English dates
function formatEventDate(dateStr, locale) {
  if (!dateStr) return "";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : "en-GB", { dateStyle: "full" }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

// Complete localized mock data (Arabic and English)
const MOCK_EVENTS = {
  registration_open: {
    id: "evt-1",
    slug: "puppet-festival",
    titleAr: "مهرجان حلب لمسرح الطفل والدمى المتحركة",
    titleEn: "Aleppo Festival for Children's Theatre and Puppetry",
    categoryAr: "ورشات تفاعلية للأطفال",
    categoryEn: "Interactive Children's Workshops",
    status: "registration_open",
    statusLabelAr: "التسجيل مفتوح",
    statusLabelEn: "Registration Open",
    shortDescriptionAr: "مهرجان عائلي تفاعلي يضم عروض مسرح طفل، وعروض مسرح الدمى، بالإضافة لورش عمل فنية للأطفال لتعليم صنع الدمى التقليدية في حلب الشهباء.",
    shortDescriptionEn: "An interactive family festival featuring children's theatre plays, puppet shows, and artistic workshops teaching kids how to craft traditional puppets in Aleppo.",
    fullDescriptionAr: `<p>يسر وزارة الثقافة السورية بالتعاون مع مديرية ثقافة حلب إطلاق الدورة الرابعة من <strong>مهرجان حلب لمسرح الطفل والدمى المتحركة</strong>.</p>
    <p>يتضمن المهرجان هذا العام برنامجاً غنياً يهدف إلى إحياء الموروث الثقافي الفني لمسرح خيال الظل والدمى التقليدية، مع تقديم عروض مسرحية تفاعلية تستهدف الأطفال واليافعين وعائلاتهم.</p>
    <ul>
      <li>عروض مسرحية حية يومياً على مسرح الكندي.</li>
      <li>ورش عمل تدريبية مجانية للأطفال من عمر 7 إلى 14 سنة لصنع الدمى من مواد بيئية بسيطة.</li>
      <li>ندوات حوارية لأولياء الأمور حول أثر المسرح التفاعلي في تنمية مهارات الطفل اللغوية والحركية.</li>
    </ul>
    <p>تلتزم الوزارة بتقديم تجربة ثقافية آمنة وممتعة للجميع، نرحب بكم وبتفاعلكم الإيجابي.</p>`,
    fullDescriptionEn: `<p>The Syrian Ministry of Culture, in collaboration with the Directorate of Culture in Aleppo, is pleased to launch the 4th edition of the <strong>Aleppo Festival for Children's Theatre and Puppetry</strong>.</p>
    <p>This year's festival features a rich program aimed at reviving the artistic heritage of shadow play and traditional puppetry, alongside interactive plays for children, youth, and families.</p>
    <ul>
      <li>Daily live theatrical performances at Al-Kindi Theatre.</li>
      <li>Free training workshops for children (ages 7 to 14) on crafting puppets using simple eco-friendly materials.</li>
      <li>Panel discussions for parents on the impact of interactive theatre on children's cognitive and language skills.</li>
    </ul>
    <p>We are committed to providing a safe, accessible, and delightful cultural experience for all.</p>`,
    heroImage: { url: "/images/event-kids.jpg", alt: "أطفال يصنعون دمى متحركة | Children making puppets" },
    startDate: "2026-08-20T11:00:00",
    endDate: "2026-08-24T16:00:00",
    startTime: "11:00",
    endTime: "16:00",
    cityAr: "حلب",
    cityEn: "Aleppo",
    locationAr: "المركز الثقافي العربي في حلب - مسرح الكندي",
    locationEn: "Arab Cultural Center in Aleppo - Al-Kindi Theatre",
    addressAr: "حلب، الجميلية، شارع المراكز الثقافية مقابل حديقة الكندي",
    addressEn: "Aleppo, Al-Jamiliah, Cultural Centers Street, opposite Al-Kindi Park",
    organizer: {
      nameAr: "مديرية ثقافة حلب - قسم ثقافة الطفل",
      nameEn: "Aleppo Culture Directorate - Child Culture Department",
      descriptionAr: "مديرية فرعية تابعة لوزارة الثقافة تعنى بتنشيط الحراك الثقافي والفني للأطفال في محافظة حلب صوناً للهوية الثقافية السورية.",
      descriptionEn: "A branch of the Ministry of Culture dedicated to enriching artistic and cultural activities for children in Aleppo, preserving Syrian heritage."
    },
    contactEmail: "child-culture-aleppo@moc.gov.sy",
    contactPhone: "+963 21 222 3456",
    accessibilityInformationAr: "المسرح مجهز بمسارات خاصة للكراسي المتحركة ومقاعد مخصصة لذوي الهمم في الصفوف الأمامية.",
    accessibilityInformationEn: "The theatre is fully accessible with wheelchair ramps and designated seating for people of determination in the front rows.",
    registrationType: "ticketed",
    registrationStatus: "open",
    registrationMessageAr: "يرجى حجز التذاكر مسبقاً وتأكيد الحضور. المقاعد محدودة وتخضع للمطابقة عند الباب.",
    registrationMessageEn: "Please book your tickets in advance and confirm attendance. Seats are limited and subject to verification at the entrance.",
    registrationUrl: "/api/citizen/events/evt-1/book",
    registrationCtaLabelAr: "احجز مقعدك الآن مجاناً",
    registrationCtaLabelEn: "Reserve Your Seat For Free",
    isFree: true,
    price: 0,
    priceCurrencyAr: "ل.س",
    priceCurrencyEn: "SYP",
    capacity: 200,
    availableSeats: 124,
    currentUrl: "https://moc.gov.sy/events/puppet-festival",
  },
  free_no_registration: {
    id: "evt-2",
    slug: "music-orchestra",
    titleAr: "حفل الفرقة الوطنية السورية للموسيقا العربية بقيادة المايسترو عدنان أيلول",
    titleEn: "Syrian National Orchestra Concert conducted by Maestro Adnan Ailoul",
    categoryAr: "حفل غنائي وموسيقي",
    categoryEn: "Concert & Music Performance",
    status: "available",
    statusLabelAr: "متاحة الآن",
    statusLabelEn: "Available Now",
    shortDescriptionAr: "أمسية موسيقية كلاسيكية تستحضر روائع التراث الغنائي السوري والموشحات الأندلسية بحناجر مطربين سوريين متميزين بدمشق.",
    shortDescriptionEn: "A classical musical evening invoking the masterpieces of Syrian vocal heritage and Andalusian Muwashahat by prominent vocalists in Damascus.",
    fullDescriptionAr: `<p>أمسية موسيقية كلاسيكية ساحرة تستحضر روائع التراث الغنائي السوري الأصيل والموشحات الأندلسية، بتقديم الفرقة الوطنية السورية للموسيقا العربية وبقيادة المايسترو عدنان أيلول.</p>`,
    fullDescriptionEn: `<p>An enchanting classical concert presenting the masterpieces of authentic Syrian musical heritage and Andalusian vocal suites by the Syrian National Orchestra.</p>`,
    heroImage: { url: "/images/event-music.jpg", alt: "الفرقة الموسيقية تعزف على المسرح | Orchestra performing on stage" },
    startDate: "2026-08-10T20:00:00",
    endDate: "2026-08-10T22:30:00",
    startTime: "20:00",
    endTime: "22:30",
    cityAr: "دمشق",
    cityEn: "Damascus",
    locationAr: "مسرح دار الأوبرا بدمشق - القاعة الرئيسية",
    locationEn: "Damascus Opera House - Main Auditorium",
    addressAr: "دمشق، ساحة الأمويين، الهيئة العامة لدار الأسد للثقافة والفنون",
    addressEn: "Damascus, Umayyad Square, Al-Assad National House for Culture and Arts",
    registrationType: "not_required",
    registrationStatus: "open",
    isFree: true,
    price: 0,
    priceCurrencyAr: "ل.س",
    priceCurrencyEn: "SYP",
    accessibilityInformationAr: "تتوفر مصعد وممرات مهيأة لسهولة حركة ذوي الاحتياجات الخاصة وكبار السن.",
    accessibilityInformationEn: "Elevators and accessible pathways are available for visitors with mobility impairments and senior citizens.",
    organizer: {
      nameAr: "الهيئة العامة لدار الأسد للثقافة والفنون (أوبرا دمشق)",
      nameEn: "Al-Assad House for Culture and Arts (Damascus Opera)",
    },
    contactEmail: "opera-info@moc.gov.sy",
    currentUrl: "https://moc.gov.sy/events/music-orchestra",
  },
  fully_booked: {
    id: "evt-3",
    slug: "theater-play",
    titleAr: "عرض مسرحية \"تحت السقف البارد\" للمخرج السوري قيس زريقة",
    titleEn: "\"Under the Cold Roof\" - Theatre Play directed by Qais Zraika",
    categoryAr: "عرض مسرحي",
    categoryEn: "Theatre Play",
    status: "full",
    statusLabelAr: "اكتمل العدد",
    statusLabelEn: "Fully Booked",
    shortDescriptionAr: "عرض مسرحي معاصر يناقش قضايا الهوية والانتماء والاغتراب الاجتماعي في قالب درامي مشوق بمسرح القباني.",
    shortDescriptionEn: "A contemporary theatrical production addressing themes of identity, belonging, and social alienation in a dramatic layout at Al-Qabbani.",
    fullDescriptionAr: `<p>عرض مسرحي معاصر يسلط الضوء على تساؤلات الوجود، الهوية، والاغتراب الاجتماعي والأسري ضمن قالب درامي ونفسي عميق.</p>`,
    fullDescriptionEn: `<p>A modern drama production exploring existential queries, identity, and social isolation within a deep psychological frame.</p>`,
    heroImage: { url: "/images/event-theater.jpg", alt: "لقطة من العرض المسرحي | Scene from the play" },
    startDate: "2026-08-12T19:00:00",
    endDate: "2026-08-14T21:30:00",
    startTime: "19:00",
    endTime: "21:30",
    cityAr: "دمشق",
    cityEn: "Damascus",
    locationAr: "مسرح القباني بدمشق",
    locationEn: "Al-Qabbani Theatre in Damascus",
    addressAr: "دمشق، شارع البرازيل، مسرح القباني الأثري",
    addressEn: "Damascus, Brazil Street, Al-Qabbani Historical Theatre",
    registrationType: "ticketed",
    registrationStatus: "full",
    registrationMessageAr: "عذراً، اكتملت جميع المقاعد المتاحة لهذا العرض. يمكنك الانضمام لقائمة الانتظار ليتم إشعارك في حال إلغاء أي حجز.",
    registrationMessageEn: "Sorry, all seats are fully booked for this performance. You may join the waiting list to be notified if seats become available.",
    waitingListUrl: "/api/citizen/events/evt-3/waiting-list",
    isFree: true,
    capacity: 80,
    availableSeats: 0,
    currentUrl: "https://moc.gov.sy/events/theater-play",
  },
  invitation_only: {
    id: "evt-4",
    slug: "book-fair",
    titleAr: "ندوة حوارية: مستقبل الخط العربي وتجليات الفن الرقمي",
    titleEn: "Symposium: The Future of Arabic Calligraphy and Digital Art",
    categoryAr: "ندوات ومحاضرات فكرية",
    categoryEn: "Seminars & Lectures",
    status: "upcoming",
    statusLabelAr: "بدعوة خاصة",
    statusLabelEn: "By Invitation Only",
    shortDescriptionAr: "ندوة نخبوية تستضيف كبار الخطاطين والمصممين السوريين لمناقشة دمج الأصالة الفنية والتقانات الرقمية المعاصرة.",
    shortDescriptionEn: "A specialized seminar hosting leading Syrian calligraphers and designers to discuss the fusion of artistic authenticity and digital arts.",
    fullDescriptionAr: `<p>ندوة مغلقة تستضيف نخبة من الباحثين والخطاطين السوريين لبحث سبل صون فن الخط العربي وإعادة تقديمه عبر أساليب الفن الرقمي المعاصر.</p>`,
    fullDescriptionEn: `<p>An exclusive panel hosting Syrian researchers and artists to discuss preserving Arabic calligraphy and integrating it into modern digital mediums.</p>`,
    heroImage: { url: "/images/event-symp.jpg", alt: "لوحات خط عربي تفاعلية | Interactive calligraphy canvases" },
    startDate: "2026-08-25T17:30:00",
    endDate: "2026-08-25T19:30:00",
    startTime: "17:30",
    endTime: "19:30",
    cityAr: "دمشق",
    cityEn: "Damascus",
    locationAr: "المركز الثقافي العربي في أبو رمانة - قاعة المحاضرات",
    locationEn: "Arab Cultural Center in Abu Rummaneh - Lectures Hall",
    addressAr: "دمشق، أبو رمانة، شارع الجلاء مقابل السفارة الفرنسية سابقاً",
    addressEn: "Damascus, Abu Rummaneh, Al-Jalaa Street, opposite the former French Embassy",
    registrationType: "invitation_only",
    registrationStatus: "unavailable",
    registrationMessageAr: "الحضور لهذه الندوة يقتصر على أصحاب الدعوات الرسمية الموجهة من مديرية المراكز الثقافية.",
    registrationMessageEn: "Attendance to this panel is restricted to official invitees of the Cultural Centers Directorate.",
    isFree: true,
    currentUrl: "https://moc.gov.sy/events/arabic-calligraphy-digital",
  },
  external_registration: {
    id: "evt-5",
    slug: "opera-concert",
    titleAr: "أمسية كلاسيكية لرباعي الوتريات بدار الأوبرا بدمشق",
    titleEn: "Classical String Quartet Evening at Damascus Opera",
    categoryAr: "حفل غنائي وموسيقي",
    categoryEn: "Concert & Music Performance",
    status: "registration_open",
    statusLabelAr: "التسجيل مفتوح",
    statusLabelEn: "Registration Open",
    shortDescriptionAr: "أمسية غنائية كلاسيكية مميزة تنظمها دار الأسد وتتم إدارة حجوزاتها مباشرة عبر بوابتها الرقمية الحليفة.",
    shortDescriptionEn: "A classical string concert organized by Al-Assad House, with ticket reservations managed directly via their official portal.",
    fullDescriptionAr: `<p>أمسية موسيقية كلاسيكية يقدمها رباعي دمشق الوتري لعزف روائع باخ وموتسارت بدار الأوبرا بدمشق.</p>`,
    fullDescriptionEn: `<p>A classical string chamber concert performed by the Damascus Quartet rendering masterpieces of Bach and Mozart.</p>`,
    startDate: "2026-08-28T20:00:00",
    endDate: "2026-08-28T22:00:00",
    startTime: "20:00",
    endTime: "22:00",
    cityAr: "دمشق",
    cityEn: "Damascus",
    locationAr: "الهيئة العامة لدار الأسد للثقافة والفنون - القاعة متعددة الاستعمالات",
    locationEn: "Al-Assad House for Culture and Arts - Multi-purpose Auditorium",
    registrationType: "external",
    registrationStatus: "open",
    registrationUrl: "https://damascusopera.gov.sy/tickets/evt-5",
    registrationCtaLabelAr: "احجز مقعدك عبر بوابة دار الأوبرا",
    registrationCtaLabelEn: "Book via Damascus Opera Portal",
    isFree: false,
    price: 3500,
    priceCurrencyAr: "ل.س",
    priceCurrencyEn: "SYP",
    currentUrl: "https://moc.gov.sy/events/opera-concert",
  },
  cancelled: {
    id: "evt-6",
    titleAr: "ملتقى الآثار والمدن المنسية في ريف إدلب الأثري",
    titleEn: "Antiquities & Dead Cities Forum in Rural Idlib",
    categoryAr: "ندوات ومحاضرات فكرية",
    categoryEn: "Seminars & Lectures",
    status: "cancelled",
    statusLabelAr: "تم إلغاء الفعالية",
    statusLabelEn: "Cancelled",
    shortDescriptionAr: "فعالية تسلط الضوء على الإرث المعماري والأثري الفريد لمواقع شمال غرب سوريا المدرجة على لوائح التراث العالمي.",
    shortDescriptionEn: "A cultural forum highlighting the unique architectural and archaeological legacy of the Dead Cities of northwest Syria.",
    fullDescriptionAr: "<p>تم إلغاء هذه الفعالية لأسباب لوجستية طارئة متعلقة بتجهيز الموقع البديل.</p>",
    fullDescriptionEn: "<p>This forum was cancelled due to unexpected logistical limitations at the venue site.</p>",
    startDate: "2026-08-30T11:00:00",
    cityAr: "إدلب",
    cityEn: "Idlib",
    locationAr: "المركز الثقافي في إدلب (مؤقت)",
    locationEn: "Idlib Cultural Center (Temporary)",
    registrationType: "unavailable",
    registrationStatus: "unavailable",
    registrationMessageAr: "نعتذر من السادة المهتمين، لقد تم إلغاء هذه الفعالية بالكامل ولن تقام في الموعد المحدد.",
    registrationMessageEn: "We apologize to the public, this event was officially cancelled and will not take place.",
    currentUrl: "https://moc.gov.sy/events/dead-cities-forum",
  },
  postponed: {
    id: "evt-7",
    titleAr: "معرض التصوير الضوئي الميداني \"سوريا بعدسات الشباب\"",
    titleEn: "Field Photography Exhibition \"Syria through Youth Lenses\"",
    categoryAr: "معرض فنون تشكيلية",
    categoryEn: "Fine Arts Exhibition",
    status: "postponed",
    statusLabelAr: "تم تأجيل الفعالية",
    statusLabelEn: "Postponed",
    shortDescriptionAr: "معرض فوتوغرافي يستعرض لقطات مميزة للمصورين الهواة تبرز جمال الطبيعة والتراث المعماري السوري.",
    shortDescriptionEn: "A field photography exhibition showcasing snapshots by amateur photographers focusing on nature and Syrian architectural heritage.",
    startDate: "2026-09-01",
    cityAr: "اللاذقية",
    cityEn: "Latakia",
    locationAr: "المركز الثقافي العربي في اللاذقية - صالة المعارض",
    locationEn: "Arab Cultural Center in Latakia - Exhibition Gallery",
    registrationType: "unavailable",
    registrationStatus: "unavailable",
    registrationMessageAr: "نلفت عناية الجمهور الكريم بأنه قد تم تأجيل موعد المعرض إلى تاريخ لاحق سيتم الإعلان عنه قريباً لدواعي استكمال اللوحات المشاركة.",
    registrationMessageEn: "Please be advised that this exhibition has been postponed to a later date to be announced shortly.",
    currentUrl: "https://moc.gov.sy/events/youth-photography",
  },
  ended: {
    id: "evt-8",
    titleAr: "معرض الفنون التشكيلية المعاصر لفناني محافظة حمص الموهوبين",
    titleEn: "Contemporary Fine Arts Exhibition for Gifted Homs Artists",
    categoryAr: "معرض فنون تشكيلية",
    categoryEn: "Fine Arts Exhibition",
    status: "ended",
    statusLabelAr: "منتهية",
    statusLabelEn: "Event Ended",
    shortDescriptionAr: "معرض تشكيلي مميز ضم أكثر من 60 لوحة ومنحوتة فنية تحاكي الأمل وإعادة الإعمار بمشاركة 22 فناناً تشكيلياً بحمص.",
    shortDescriptionEn: "A unique gallery showcasing over 60 paintings and sculptures capturing hope and reconstruction by 22 Homs artists.",
    startDate: "2026-07-10T10:00:00",
    endDate: "2026-07-15T20:00:00",
    cityAr: "حمص",
    cityEn: "Homs",
    locationAr: "المركز الثقافي العربي في حمص - صالة المعارض الكبرى",
    locationEn: "Arab Cultural Center in Homs - Grand Exhibition Hall",
    registrationType: "unavailable",
    registrationStatus: "unavailable",
    registrationMessageAr: "لقد انتهت هذه الفعالية وأغلقت أبوابها. نرحب بكم في فعالياتنا القادمة.",
    registrationMessageEn: "This event has already ended and closed its doors. We look forward to welcoming you in upcoming events.",
    currentUrl: "https://moc.gov.sy/events/homs-fine-arts",
  }
};

// Reusable Redesigned Component: Breadcrumb
function Breadcrumb({ category, title, locale }) {
  const isAr = locale === "ar";
  return (
    <nav className="flex items-center gap-2 text-xs md:text-sm text-slate-500 font-medium overflow-hidden whitespace-nowrap" aria-label="Breadcrumb">
      <Link href={`/${locale}`} className="hover:text-[#003F35] transition-colors shrink-0">
        {isAr ? "الرئيسية" : "Home"}
      </Link>
      <span className="text-slate-300 shrink-0">/</span>
      <Link href={`/${locale}/calendar`} className="hover:text-[#003F35] transition-colors shrink-0">
        {isAr ? "الروزنامة الثقافية" : "Calendar"}
      </Link>
      {category && (
        <>
          <span className="text-slate-300 shrink-0">/</span>
          <span className="text-[#B79A58] font-bold truncate max-w-[120px] md:max-w-none">
            {category}
          </span>
        </>
      )}
    </nav>
  );
}

// Reusable Redesigned Component: Badges
function EventBadges({ categoryName, status, statusLabel, isAr }) {
  const badgeColors = {
    registration_open: "bg-[#EEF5F2] text-[#003F35] border-[#DDE4E1]",
    available: "bg-[#EEF5F2] text-[#003F35] border-[#DDE4E1]",
    upcoming: "bg-[#EEF5F2] text-[#B79A58] border-[#B79A58]/20",
    full: "bg-[#FFF6DF] text-amber-900 border-amber-200",
    ended: "bg-slate-100 text-slate-600 border-slate-200",
    postponed: "bg-blue-50 text-blue-800 border-blue-200",
    cancelled: "bg-[#FCEDEC] text-red-700 border-red-200",
  };

  const badgeClass = badgeColors[status] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {categoryName && (
        <span className="inline-block px-3 py-1 rounded-full bg-[#003F35]/5 text-[#003F35] text-xs font-bold border border-[#003F35]/10">
          {categoryName}
        </span>
      )}
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${badgeClass}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        <span>{statusLabel}</span>
      </span>
    </div>
  );
}

// Reusable Redesigned Component: Unified Information Panel
function EventInformationPanel({ startDate, endDate, startTime, endTime, location, city, address, locale }) {
  const isAr = locale === "ar";
  if (!startDate) return null;

  // Formatting helpers
  const dateStr = endDate
    ? `${formatEventDate(startDate, locale)} – ${formatEventDate(endDate, locale)}`
    : formatEventDate(startDate, locale);

  const timeStr = startTime
    ? (endTime ? `${startTime} – ${endTime}` : startTime)
    : (isAr ? "الوقت غير محدد" : "Time unspecified");

  return (
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
              {dateStr}
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
              {timeStr}
            </span>
          </div>
        </div>

        {/* Venue/Location */}
        <div className="lg:col-span-5 flex gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF5F2] text-[#003F35]">
            <MapPin size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold text-[#60716D] uppercase tracking-wide">
              {isAr ? "مكان الفعالية" : "Venue"}
            </span>
            <span className="block mt-1 text-sm font-bold text-[#153832] leading-relaxed">
              {location} {city && `، ${city}`}
            </span>
            {address && (
              <span className="block mt-0.5 text-xs text-[#60716D] font-normal leading-relaxed">
                {address}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// Reusable Redesigned Component: AttendanceCard
function AttendanceCard({ event, locale }) {
  const isAr = locale === "ar";
  const [copied, setCopied] = useState(false);

  const priceText = event.isFree
    ? (isAr ? "الدخول مجاني" : "Free Admission")
    : `${event.price} ${event.priceCurrencyAr || (isAr ? "ل.س" : "SYP")}`;

  const shareEvent = async () => {
    const url = typeof window === "undefined" ? event.currentUrl : window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: isAr ? event.titleAr : event.titleEn, url });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <section className="bg-white border border-[#DDE4E1] shadow-[0_12px_32px_rgba(0,63,53,0.06)] rounded-3xl p-6 flex flex-col gap-6" aria-labelledby="sidebar-attendance-title">
      <div className="flex items-start justify-between border-b border-[#DDE4E1]/60 pb-4">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] text-[#B79A58] uppercase">
            {isAr ? "بطاقة الحضور" : "Attendance Ticket"}
          </p>
          <h3 id="sidebar-attendance-title" className="mt-1 text-xl font-bold text-[#153832]">
            {priceText}
          </h3>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF5F2] text-[#003F35]">
          <Users size={18} />
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {event.status === "cancelled" ? (
          <div className="flex items-center gap-2 rounded-xl bg-[#FCEDEC] p-4 text-xs font-bold text-red-800 border border-red-100">
            <XCircle size={16} className="shrink-0" />
            <span>{isAr ? "تم إلغاء الفعالية رسمياً." : "This event has been cancelled."}</span>
          </div>
        ) : event.status === "postponed" ? (
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 p-4 text-xs font-bold text-blue-900 border border-blue-100">
            <AlertCircle size={16} className="shrink-0" />
            <span>{isAr ? "تم تأجيل موعد الفعالية." : "This event has been postponed."}</span>
          </div>
        ) : event.status === "ended" ? (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-xs font-bold text-slate-600 border border-slate-100">
            <CalendarX size={16} className="shrink-0" />
            <span>{isAr ? "انتهت هذه الفعالية." : "This event has ended."}</span>
          </div>
        ) : (
          <>
            {/* Registration is open */}
            {event.registrationStatus === "open" && event.registrationType === "ticketed" && (
              <div className="flex flex-col gap-3">
                {event.availableSeats > 0 && (
                  <p className="text-xs text-[#60716D] font-bold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{isAr ? `المقاعد المتبقية: ${event.availableSeats}` : `Seats left: ${event.availableSeats}`}</span>
                  </p>
                )}
                <button
                  type="button"
                  className="min-h-12 w-full flex items-center justify-center rounded-xl bg-[#003F35] text-white font-bold text-sm hover:bg-[#002F28] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B79A58]"
                >
                  {isAr ? event.registrationCtaLabelAr : event.registrationCtaLabelEn}
                </button>
              </div>
            )}

            {/* Registration not required / free */}
            {event.registrationType === "not_required" && (
              <div className="rounded-xl bg-[#EEF5F2] border border-[#DDE4E1]/80 p-4 text-xs font-bold text-[#003F35]">
                <p>{isAr ? "✓ الدخول مجاني" : "✓ Free Admission"}</p>
                <p className="mt-1 text-[11px] font-medium text-[#60716D]">
                  {isAr ? "لا يلزم حجز مسبق. الحضور حسب أسبقية الوصول." : "No pre-booking required. Seating is first-come, first-served."}
                </p>
              </div>
            )}

            {/* Invitation only */}
            {event.registrationType === "invitation_only" && (
              <div className="rounded-xl bg-amber-50 border border-amber-200/60 p-4 text-xs font-bold text-amber-900">
                <p>{isAr ? "حضور بموجب دعوة رسمية" : "By Invitation Only"}</p>
                <p className="mt-1 text-[11px] font-medium text-[#60716D]">
                  {isAr ? event.registrationMessageAr : event.registrationMessageEn}
                </p>
              </div>
            )}

            {/* External Registration */}
            {event.registrationType === "external" && (
              <a
                href={event.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-12 w-full flex items-center justify-center gap-2 rounded-xl bg-[#003F35] text-white font-bold text-sm hover:bg-[#002F28] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B79A58]"
              >
                <span>{isAr ? event.registrationCtaLabelAr : event.registrationCtaLabelEn}</span>
                <ExternalLink size={16} />
              </a>
            )}

            {/* Full / Waiting list */}
            {event.registrationStatus === "full" && (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl bg-[#FFF6DF] border border-amber-200 p-4 text-xs font-bold text-amber-900">
                  <p>{isAr ? "اكتمل عدد المقاعد" : "Fully Booked"}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-600">
                    {isAr ? "التسجيل مغلق لتجاوز السعة الاستيعابية." : "Registration closed as capacity has been reached."}
                  </p>
                </div>
                {event.waitingListUrl && (
                  <button
                    type="button"
                    className="min-h-11 w-full flex items-center justify-center rounded-xl border border-[#003F35] text-[#003F35] bg-white font-bold text-sm hover:bg-[#EEF5F2] transition-colors"
                  >
                    {isAr ? "الانضمام إلى قائمة الانتظار" : "Join Waiting List"}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-[#DDE4E1]/80 pt-4">
        {event.startDate && event.status !== "cancelled" && event.status !== "ended" && (
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#DDE4E1] hover:border-[#B79A58] text-xs font-bold text-[#153832] transition hover:bg-slate-50 cursor-pointer"
          >
            <CalendarPlus size={14} className="text-[#B79A58]" />
            <span>{isAr ? "إضافة للتقويم" : "Add to calendar"}</span>
          </button>
        )}
        <button
          type="button"
          onClick={shareEvent}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#DDE4E1] hover:border-[#B79A58] text-xs font-bold text-[#153832] transition hover:bg-slate-50 cursor-pointer"
        >
          {copied ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} className="text-[#B79A58]" />}
          <span>{copied ? (isAr ? "تم نسخ الرابط" : "Share link") : (isAr ? "مشاركة" : "Share")}</span>
        </button>
      </div>
    </section>
  );
}

export default function EventPreviewClient({ locale }) {
  const [activeState, setActiveState] = useState("registration_open");
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isAr = locale === "ar";
  const event = MOCK_EVENTS[activeState] || MOCK_EVENTS.registration_open;

  const triggerLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  const toggleError = () => {
    setHasError(!hasError);
  };

  // Dynamically resolve properties based on locale
  const title = isAr ? event.titleAr : event.titleEn;
  const category = isAr ? event.categoryAr : event.categoryEn;
  const statusLabel = isAr ? event.statusLabelAr : event.statusLabelEn;
  const shortDescription = isAr ? event.shortDescriptionAr : event.shortDescriptionEn;
  const description = isAr ? event.fullDescriptionAr : event.fullDescriptionEn;
  const location = isAr ? event.locationAr : event.locationEn;
  const city = isAr ? event.cityAr : event.cityEn;
  const address = isAr ? event.addressAr : event.addressEn;
  const accessibility = isAr ? event.accessibilityInformationAr : event.accessibilityInformationEn;
  const organizerName = isAr ? event.organizer?.nameAr : event.organizer?.nameEn;
  const organizerDesc = isAr ? event.organizer?.descriptionAr : event.organizer?.descriptionEn;

  // Simulated Related Events
  const simulatedRelated = [
    {
      id: "rel-1",
      titleAr: "حفل الفرقة الوطنية السورية للموسيقا العربية بقيادة المايسترو عدنان أيلول",
      titleEn: "Syrian National Orchestra Concert conducted by Maestro Adnan Ailoul",
      startDate: "2026-08-10T20:00:00",
      locationAr: "مسرح دار الأوبرا بدمشق - القاعة الرئيسية",
      locationEn: "Damascus Opera House - Main Auditorium",
      featuredImage: "/images/event-music.jpg",
      categoryAr: "حفل غنائي وموسيقي",
      categoryEn: "Concert & Music",
    },
    {
      id: "rel-2",
      titleAr: "عرض مسرحية \"تحت السقف البارد\" للمخرج السوري قيس زريقة",
      titleEn: "\"Under the Cold Roof\" - Theatre Play directed by Qais Zraika",
      startDate: "2026-08-12T19:00:00",
      locationAr: "مسرح القباني بدمشق",
      locationEn: "Al-Qabbani Theatre in Damascus",
      featuredImage: "/images/event-theater.jpg",
      categoryAr: "عرض مسرحي",
      categoryEn: "Theatre Play",
    },
    {
      id: "rel-3",
      titleAr: "ندوة حوارية: مستقبل الخط العربي وتجليات الفن الرقمي",
      titleEn: "Symposium: The Future of Arabic Calligraphy and Digital Art",
      startDate: "2026-08-25T17:30:00",
      locationAr: "المركز الثقافي العربي في أبو رمانة",
      locationEn: "Arab Cultural Center in Abu Rummaneh",
      featuredImage: "/images/event-symp.jpg",
      categoryAr: "ندوات ومحاضرات فكرية",
      categoryEn: "Seminars & Lectures",
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8F7F2] pb-16 pt-[100px] lg:pt-[122px]" dir={isAr ? "rtl" : "ltr"}>
      {/* 1. Dashboard State Toggle Bar */}
      <div className="bg-[#003F35] text-white py-4 shadow-md sticky top-[100px] lg:top-[122px] z-50 border-b border-[#B79A58]/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#B79A58]">
                {isAr ? "لوحة معاينة تصميم تفاصيل الفعالية الفاخر" : "Premium Event Redesign Preview Dashboard"}
              </span>
              <h2 className="text-sm font-bold text-white mt-0.5">
                {isAr ? "اختر حالة الفعالية لمعاينة توافق التصميم التلقائي:" : "Choose an event state to preview layout auto-adaptation:"}
              </h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(MOCK_EVENTS).map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    setHasError(false);
                    setActiveState(k);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    activeState === k && !hasError
                      ? "bg-[#B79A58] text-white border-[#B79A58] shadow-sm"
                      : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {isAr ? MOCK_EVENTS[k].statusLabelAr : MOCK_EVENTS[k].statusLabelEn}
                </button>
              ))}
              {/* Simulation triggers */}
              <button
                onClick={triggerLoading}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 flex items-center gap-1 cursor-pointer"
              >
                <Loader2 size={12} className={loading ? "animate-spin" : ""} />
                <span>{isAr ? "محاكاة التحميل" : "Simulate Loading"}</span>
              </button>

              <button
                onClick={toggleError}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  hasError
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                }`}
              >
                <span>{isAr ? "محاكاة الخطأ" : "Simulate Error"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN RENDER AREA */}
      {hasError ? (
        /* REDESIGNED ERROR STATE */
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#FCEDEC] text-red-600 flex items-center justify-center mb-6">
            <XCircle size={36} />
          </div>
          <h1 className="text-2xl font-bold text-[#153832] font-qomra">
            {isAr ? "تعذر تحميل معلومات الفعالية" : "Could not load event information"}
          </h1>
          <p className="mt-3 text-sm text-[#60716D] max-w-md leading-relaxed">
            {isAr ? "حدث خطأ غير متوقع أثناء الاتصال بالخادم وقاعدة البيانات. يرجى التحقق من اتصال الإنترنت وإعادة المحاولة." : "An unexpected database connection error occurred. Please check your network and try again."}
          </p>
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setHasError(false)}
              className="px-5 py-2.5 rounded-xl bg-[#003F35] text-white font-bold text-sm hover:bg-[#002F28] transition cursor-pointer"
            >
              {isAr ? "إعادة المحاولة" : "Retry"}
            </button>
            <Link
              href={`/${locale}/calendar`}
              className="px-5 py-2.5 rounded-xl border border-[#DDE4E1] bg-white text-[#153832] font-bold text-sm hover:bg-slate-50 transition"
            >
              {isAr ? "تصفح جميع الفعاليات" : "Browse All Events"}
            </Link>
          </div>
        </div>
      ) : loading ? (
        /* REDESIGNED SKELETON LOADER */
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 animate-pulse">
          <div className="h-4 w-48 bg-slate-200 rounded mb-4" />
          <div className="flex gap-2 mb-4">
            <div className="h-6 w-20 bg-slate-200 rounded-full" />
            <div className="h-6 w-24 bg-slate-200 rounded-full" />
          </div>
          <div className="h-10 w-2/3 bg-slate-200 rounded mb-8" />
          <div className="mx-auto aspect-[4/5] w-full max-w-[540px] bg-slate-200 rounded-3xl mb-8" />
          <div className="h-20 w-full bg-slate-200 rounded-2xl mb-8" />
          <div className="grid gap-10 lg:grid-cols-[1fr_370px]">
            <div className="space-y-4">
              <div className="h-6 w-28 bg-slate-200 rounded" />
              <div className="h-4 w-full bg-slate-200 rounded" />
              <div className="h-4 w-full bg-slate-200 rounded" />
              <div className="h-4 w-3/4 bg-slate-200 rounded" />
            </div>
            <div className="h-48 bg-slate-200 rounded-3xl" />
          </div>
        </div>
      ) : (
        /* REDESIGNED EVENT DETAILS VIEW */
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <header className="mb-6">
            <Breadcrumb category={category} title={title} locale={locale} />
            <div className="mt-4">
              <EventBadges
                categoryName={category}
                status={event.status}
                statusLabel={statusLabel}
                isAr={isAr}
              />
            </div>
            <h1 className="mt-4 text-3xl font-bold text-[#153832] leading-tight sm:text-5xl font-qomra">
              {title}
            </h1>
            {shortDescription && (
              <p className="mt-3 text-sm text-[#60716D] max-w-3xl leading-relaxed">
                {shortDescription}
              </p>
            )}
          </header>

          {/* Portrait event poster */}
          <EventArtwork
            src={event.heroImage?.url}
            alt={event.heroImage?.alt || title}
            preload
            sizes="(max-width: 639px) calc(100vw - 2rem), 540px"
            className="mx-auto mb-8 w-full max-w-[540px] rounded-3xl border border-[#DDE4E1]/80 shadow-[0_8px_24px_rgba(0,63,53,0.05)]"
          />

          {/* Unified Details Panel */}
          <EventInformationPanel
            startDate={event.startDate}
            endDate={event.endDate}
            startTime={event.startTime}
            endTime={event.endTime}
            location={location}
            city={city}
            address={address}
            locale={locale}
          />

          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_370px]">
            {/* Right Column: Main Body Info */}
            <div className="min-w-0 flex flex-col gap-10">
              {/* Event Description */}
              {description && (
                <article>
                  <h2 className="text-xl font-bold text-[#153832] font-qomra">
                    {isAr ? "عن الفعالية" : "About the Event"}
                  </h2>
                  <div className="mt-2 h-0.5 w-14 rounded-full bg-[#B79A58]" />
                  <div
                    className="mt-6 text-[15px] sm:text-[16px] leading-[1.95] text-slate-700 font-normal space-y-4"
                    dangerouslySetInnerHTML={{ __html: description }}
                  />
                </article>
              )}

              {/* Dynamic Details List (Contact, Target audience, language...) */}
              {(event.contactEmail || event.contactPhone || accessibility) && (
                <section className="bg-white border border-[#DDE4E1] rounded-2xl p-6 flex flex-col gap-5">
                  <h3 className="text-base font-bold text-[#153832] font-qomra border-b border-[#DDE4E1]/60 pb-3">
                    {isAr ? "تعليمات الحضور والتسهيلات" : "Attendance Instructions & Accessibility"}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {accessibility && (
                      <div className="flex gap-3 sm:col-span-2">
                        <Accessibility size={18} className="text-[#B79A58] shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-[11px] font-bold text-[#60716D]">{isAr ? "التسهيلات المتاحة" : "Accessibility"}</span>
                          <span className="block text-xs font-medium text-slate-700 mt-0.5 leading-relaxed">{accessibility}</span>
                        </div>
                      </div>
                    )}
                    {event.contactPhone && (
                      <div className="flex gap-3">
                        <Phone size={18} className="text-[#B79A58] shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-[11px] font-bold text-[#60716D]">{isAr ? "رقم التواصل" : "Contact Phone"}</span>
                          <span className="block text-xs font-mono text-slate-700 mt-0.5" dir="ltr">{event.contactPhone}</span>
                        </div>
                      </div>
                    )}
                    {event.contactEmail && (
                      <div className="flex gap-3">
                        <Mail size={18} className="text-[#B79A58] shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-[11px] font-bold text-[#60716D]">{isAr ? "البريد الإلكتروني" : "Contact Email"}</span>
                          <span className="block text-xs font-mono text-slate-700 mt-0.5">{event.contactEmail}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Dynamic Organizer Info Section */}
              {organizerName && (
                <section className="bg-white border border-[#DDE4E1] rounded-2xl p-6 flex flex-col gap-4">
                  <h3 className="text-sm font-black tracking-wide text-[#B79A58] uppercase">
                    {isAr ? "الجهة المنظمة" : "Organizing Body"}
                  </h3>
                  <div className="flex gap-4 items-start">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EEF5F2] text-[#003F35]">
                      <Building2 size={24} />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-[#153832]">{organizerName}</h4>
                      {organizerDesc && (
                        <p className="mt-1 text-xs text-[#60716D] leading-relaxed">{organizerDesc}</p>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Left Column: Sidebar Cards (Sticky desktop) */}
            <aside className="lg:sticky lg:top-36 lg:h-fit flex flex-col gap-6">
              <AttendanceCard event={event} locale={locale} />
            </aside>
          </div>

          {/* Related Upcoming Events */}
          {simulatedRelated.length > 0 && (
            <section className="mt-16 pt-12 border-t border-[#DDE4E1]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-[#153832] font-qomra">
                    {isAr ? "فعاليات ثقافية أخرى قد تهمك" : "Other Cultural Events You May Like"}
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
                {simulatedRelated.map((item) => (
                  <Link
                    key={item.id}
                    href={`/${locale}/events/preview`}
                    onClick={() => {
                      if (item.id === "rel-1") setActiveState("free_no_registration");
                      if (item.id === "rel-2") setActiveState("fully_booked");
                      if (item.id === "rel-3") setActiveState("invitation_only");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="group flex flex-col bg-white rounded-2xl border border-[#DDE4E1]/80 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 h-full"
                  >
                    <div className="relative">
                      <EventArtwork
                        src={item.featuredImage}
                        alt={isAr ? item.titleAr : item.titleEn}
                        sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc(50vw - 2.25rem), (max-width: 1151px) calc(33.333vw - 2rem), 352px"
                        className="w-full"
                      />
                      <span className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-sm text-[9px] text-[#003F35] font-black px-2 py-0.5 rounded-full border border-slate-100/40 shadow-sm">
                        {isAr ? item.categoryAr : item.categoryEn}
                      </span>
                    </div>
                    <div className="p-4 flex flex-col grow">
                      <span className="text-[10px] font-bold text-[#B79A58]">
                        {formatEventDate(item.startDate, locale)}
                      </span>
                      <h4 className="mt-1 text-sm font-bold text-slate-800 line-clamp-2 leading-relaxed group-hover:text-[#B79A58] transition-colors mb-3 flex-grow">
                        {isAr ? item.titleAr : item.titleEn}
                      </h4>
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                        <span className="text-xs text-slate-400 font-medium truncate max-w-[200px]">
                          {isAr ? item.locationAr : item.locationEn}
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
      )}
    </div>
  );
}
