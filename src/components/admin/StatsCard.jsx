import {
  Newspaper,
  Award,
  CalendarDays,
  Users,
  Inbox,
  Clock,
  FileText,
  CheckCircle,
  Theater,
  HelpCircle
} from "lucide-react";

const icons = {
  Newspaper,
  Award,
  CalendarDays,
  Users,
  Inbox,
  Clock,
  FileText,
  CheckCircle,
  Theater
};

const colorMap = {
  blue:   "bg-[#003D33]/8 text-[#003D33] border border-[#003D33]/15",
  green:  "bg-[#003D33]/8 text-[#003D33] border border-[#003D33]/15",
  purple: "bg-[#A48E68]/10 text-[#8B7654] border border-[#A48E68]/20",
  amber:  "bg-[#A48E68]/10 text-[#8B7654] border border-[#A48E68]/20",
};

export default function StatsCard({ labelAr, labelEn, value, icon, color, sub }) {
  const IconComponent = icons[icon] || HelpCircle;

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[#A48E68]/40 group">
      <div className="flex items-start justify-between">
        <div className="space-y-1 text-start">
          <p className="text-sm font-semibold text-gray-500 group-hover:text-gray-700 transition-colors">{labelAr}</p>
          <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 font-sans">{labelEn}</p>
          <p className="pt-2 text-3xl font-black text-gray-900 font-sans">{value.toLocaleString("en-GB")}</p>
          {sub && (
            <p className="pt-1 text-xs font-medium text-gray-400 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#A48E68]" />
              {sub}
            </p>
          )}
        </div>
        <div className={`rounded-xl p-3.5 transition-transform duration-300 group-hover:scale-110 ${colorMap[color] ?? "bg-gray-50 text-gray-600 border border-gray-100"}`}>
          <IconComponent className="w-6 h-6 shrink-0" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

