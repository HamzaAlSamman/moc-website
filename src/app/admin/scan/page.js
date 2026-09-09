import { notFound } from "next/navigation";
import { Fingerprint, ScanLine, ShieldCheck } from "lucide-react";

import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import AdminShell from "@/components/admin/AdminShell";
import TicketScanner from "@/components/admin/TicketScanner";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "تدقيق التذاكر — لوحة التحكم",
};

const STEPS = [
  {
    icon: ScanLine,
    title: "امسح رمز التذكرة من هذه الشاشة",
    body: "رمز التذكرة مشفّر: قارئ QR العادي يُظهر نصاً غير مفهوم ولا يفتح أي صفحة. هذه الشاشة وحدها تقرأه.",
  },
  {
    icon: Fingerprint,
    title: "طابق الاسم مع الوثيقة الثبوتية",
    body: "التذكرة اسمية. بعد المسح يظهر اسم صاحبها وآخر أربعة أرقام من رقمه الوطني — قارنها بهويته قبل الإدخال.",
  },
  {
    icon: ShieldCheck,
    title: "سجّل الدخول",
    body: "زر تسجيل الدخول يظهر للتذاكر الصالحة فقط، ويُسجَّل باسم حسابك. التذكرة المسجّلة مسبقاً تظهر بتنبيه واضح.",
  },
];

export default async function TicketScanPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "SCAN_EVENT_TICKETS")) notFound();

  return (
    <AdminShell user={user}>
      <div className="mx-auto w-full max-w-xl space-y-6" dir="rtl">
        <header>
          <p className="text-xs font-black tracking-[0.18em] text-[#A48E68]">مديرية المهرجانات والفعاليات</p>
          <h1 className="mt-2 text-2xl font-black text-slate-900">تدقيق التذاكر وتسجيل الدخول</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            قارئ الوزارة المعتمد. لا يمكن تسجيل دخول أي زائر إلا من هنا، وبحساب مخوّل بتدقيق التذاكر.
          </p>
        </header>

        <TicketScanner />

        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#003D33]/8 text-[#003D33]">
                <step.icon size={20} />
              </span>
              <div>
                <p className="text-sm font-black text-slate-800">
                  <span className="text-[#A48E68]">{index + 1}.</span> {step.title}
                </p>
                <p className="mt-1 text-xs leading-6 text-slate-500">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </AdminShell>
  );
}
