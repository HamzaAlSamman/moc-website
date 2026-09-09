import Link from "next/link";
import { BadgeCheck, CircleAlert, Clock3, IdCard } from "lucide-react";

import VerifiedBadge from "./VerifiedBadge";

export default function CitizenProfileCard({ citizen, locale = "ar" }) {
  const isAr = locale === "ar";
  const state = citizen.identityStatus;
  // مفاتيح الحالات مطابقة لـ CitizenIdentityStatus في schema.prisma.
  const states = {
    NOT_SUBMITTED: { icon: IdCard, tone: "border-slate-200 bg-slate-50 text-slate-700", title: isAr ? "البريد موثق — الهوية لم تُرفع" : "Email verified — identity not submitted", body: isAr ? "ارفع صور الهوية لتتمكن من الحجز." : "Submit identity images to unlock booking." },
    PENDING: { icon: Clock3, tone: "border-amber-200 bg-amber-50 text-amber-900", title: isAr ? "تم استلام هويتك — قيد المراجعة" : "Identity received — under review", body: isAr ? "وصلت صورتا الهوية بنجاح. سنرسل القرار إلى بريدك عند اكتمال المراجعة." : "Both identity images arrived successfully. We will email you when review is complete." },
    REJECTED: { icon: CircleAlert, tone: "border-red-200 bg-red-50 text-red-800", title: isAr ? "تم رفض الهوية" : "Identity rejected", body: citizen.identityRejectedReason || (isAr ? "يمكنك رفع صور أوضح من صفحة الهوية." : "You may submit clearer images from the identity page.") },
    VERIFIED: { icon: BadgeCheck, tone: "border-emerald-200 bg-emerald-50 text-emerald-900", title: isAr ? "الحساب موثق ويمكنك الحجز" : "Account verified and ready to book", body: isAr ? "استعرض الروزنامة واختر فعاليتك القادمة." : "Browse the calendar and choose your next event." },
  };
  const current = states[state] || states.NOT_SUBMITTED; const Icon = current.icon;
  return <div className="space-y-6"><header><p className="text-xs font-black uppercase tracking-[0.18em] text-[#A48E68]">{isAr ? "حساب المواطن" : "Citizen account"}</p><h2 className="mt-2 flex items-center gap-2 text-3xl font-black text-[#002723]">{citizen.fullName}{state === "VERIFIED" && <VerifiedBadge size={24} locale={locale} />}</h2><p className="mt-1 text-sm text-slate-500">{citizen.email} · •••• {citizen.nationalIdLast4}</p></header><div className={`rounded-2xl border p-5 ${current.tone}`}><Icon aria-hidden="true" /><h3 className="mt-3 font-black">{current.title}</h3><p className="mt-2 text-sm leading-6">{current.body}</p></div><div className="grid gap-3 sm:grid-cols-2"><Link href={`/${locale}/account/identity`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#003D33] px-4 text-sm font-black text-[#003D33] transition hover:bg-[#003D33] hover:text-white focus-visible:ring-2 focus-visible:ring-[#A48E68]">{isAr ? "إدارة الهوية" : "Manage identity"}</Link><Link href={state === "VERIFIED" ? `/${locale}/calendar` : `/${locale}/account/bookings`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#A48E68] px-4 text-sm font-black text-[#002723] transition hover:bg-[#b8a47f] focus-visible:ring-2 focus-visible:ring-[#003D33]">{state === "VERIFIED" ? (isAr ? "استعراض الفعاليات" : "Browse events") : (isAr ? "عرض حجوزاتي" : "View bookings")}</Link></div></div>;
}
