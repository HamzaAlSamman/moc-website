import { BadgeCheck } from "lucide-react";

// شارة التوثيق — تظهر بجانب اسم المواطن فقط عندما تكون هويته موثقة.
// الشكل (ختم مسنّن مملوء + علامة صح بيضاء) هو ما يجعلها تُقرأ فوراً كحساب
// موثق، تماماً كشارات إنستغرام ومنصة X، مع استخدام أخضر الوزارة بدل الأزرق
// حتى تبقى ضمن هوية الموقع البصرية.
//
// اللون يبقى قابلاً للتبديل عبر `className` إن أردنا الأزرق التقليدي لاحقاً.
export default function VerifiedBadge({ size = 18, locale = "ar", className = "", withLabel = false }) {
  const isAr = locale === "ar";
  const label = isAr ? "حساب موثق" : "Verified account";

  const icon = (
    <BadgeCheck
      size={size}
      aria-hidden={withLabel ? "true" : undefined}
      role={withLabel ? undefined : "img"}
      aria-label={withLabel ? undefined : label}
      // lucide يرسم مسارين: الختم أولاً ثم علامة الصح. نملأ الختم بالأخضر
      // ونجعل الصح أبيض — بدون هذا التخصيص تظهر الأيقونة كخطوط مفرّغة لا
      // كشارة توثيق مملوءة.
      className={`shrink-0 [&>path:first-child]:fill-[#006455] [&>path:first-child]:stroke-[#006455] [&>path:last-child]:stroke-white [&>path:last-child]:stroke-[2.5] ${className}`}
    />
  );

  if (!withLabel) return icon;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-900">
      {icon}
      {label}
    </span>
  );
}
