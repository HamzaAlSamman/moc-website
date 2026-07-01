import { FileText, ArrowLeft, Clock, CheckCircle2 } from "lucide-react";

const CATEGORIES = {
  written: "نصوص مكتوبة",
  informational: "برمجيات وتطبيقات",
  audio_visual: "صوتيات ومرئيات",
  fine_arts: "فنون تشكيلية",
  folklore: "تراث شعبي",
};

function daysAgo(d) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "اليوم";
  if (days === 1) return "منذ يوم";
  return `منذ ${days} يوم`;
}

// Compact inbox of copyright submissions sitting in the current staff member's
// stage. Rendered on the role-tailored dashboard; rows open the full review
// page (same target as the copyright manager table).
export default function CopyrightStaffQueue({ items = [], stageLabel }) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-700">لا توجد معاملات بانتظار إجرائك حالياً</p>
        <p className="text-xs text-slate-400">{stageLabel ? `مرحلتك: ${stageLabel}` : "تم إنجاز كل ما يخص مرحلتك"}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100" dir="rtl">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`/admin/copyright/${item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 py-3 px-2 -mx-2 rounded-xl hover:bg-slate-50 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#003D33]/5 text-[#003D33] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 truncate">{item.workTitle}</p>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span className="truncate">{item.applicantName}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>{CATEGORIES[item.workCategory] || item.workCategory}</span>
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 shrink-0">
              <Clock className="w-3.5 h-3.5" />
              {daysAgo(item.createdAt)}
            </span>
            <span className="bg-slate-100 text-slate-700 text-[11px] font-extrabold px-3 py-1.5 rounded-lg group-hover:bg-[#003D33] group-hover:text-white transition flex items-center gap-1 shrink-0">
              مراجعة
              <ArrowLeft className="w-3.5 h-3.5" />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
