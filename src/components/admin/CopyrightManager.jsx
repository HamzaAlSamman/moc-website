"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  RefreshCw, 
  Download, 
  Phone, 
  Mail, 
  User, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Layers, 
  Award,
  ChevronLeft,
  Info,
  Trash2
} from "lucide-react";
import { can } from "@/lib/permissions";

const STATUS_LABELS = {
  submitted: "مقدم (بانتظار الرسم الأولي)",
  finance_review: "قيد التدقيق المالي للرسم",
  under_review: "قيد الدراسة والتدقيق",
  suspended: "موقوف مؤقتاً للنواقص",
  pending_final_approval: "بانتظار الموافقة النهائية",
  rejected: "مرفوض",
  pending_fees: "بانتظار استكمال الرسوم",
  final_review: "قيد التدقيق المالي للرسم النهائي",
  completed: "منجز"
};

const STATUS_CLASSES = {
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  finance_review: "bg-teal-50 text-teal-700 border-teal-200",
  under_review: "bg-indigo-50 text-indigo-700 border-indigo-200",
  suspended: "bg-amber-50 text-amber-700 border-amber-200",
  pending_final_approval: "bg-cyan-50 text-cyan-700 border-cyan-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  pending_fees: "bg-orange-50 text-orange-700 border-orange-200",
  final_review: "bg-teal-50 text-teal-700 border-teal-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-300"
};

const CATEGORIES = {
  written: "نصوص مكتوبة — كتاب أو رواية",
  informational: "برمجيات وتطبيقات — موقع أو كود",
  audio_visual: "صوتيات أو مرئيات — أغنية أو فيلم",
  fine_arts: "فنون تشكيلية وتصميم — لوحة أو مجسم",
  folklore: "مأثورات وتراث شعبي سوري"
};

const ROLES = {
  author: "صاحب العمل الأصلي",
  agent: "وكيل رسمي مفوض",
  heir: "وارث شرعي",
  representative: "ممثل قانوني لشركة أو مؤسسة"
};

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

function daysAgo(d) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "اليوم";
  if (days === 1) return "منذ يوم";
  return `منذ ${days} أيام`;
}

// Decisions that can't be undone from this panel — confirm before firing, same
// pattern as the delete confirm in SubmissionsTable.jsx.
const CONFIRM_MESSAGES = {
  suspended: "هل أنت متأكد من إيقاف الطلب مؤقتاً لاستكمال النواقص؟",
  rejected: "هل أنت متأكد من رفض طلب الحماية؟ سيتم إخطار المتقدم بذلك.",
  completed: "هل أنت متأكد من إنجاز معاملة الحماية وتوليد الشهادة الرسمية؟ لا يمكن التراجع عن هذا الإجراء.",
};

// Ids are plain Prisma cuids (no "SY-APP-" prefix is ever generated) — shorten
// to the last 8 chars for display, full id stays available via title/copy.
function shortId(id) {
  return id.slice(-8).toUpperCase();
}

function getFileExtensionFromBase64(base64) {
  if (!base64) return "pdf";
  if (base64.startsWith("data:application/pdf")) return "pdf";
  if (base64.startsWith("data:application/vnd.openxmlformats-officedocument.wordprocessingml.document")) return "docx";
  if (base64.startsWith("data:application/msword")) return "doc";
  return "pdf";
}

export default function CopyrightManager({ initialSubmissions = [], currentUser }) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [selectedSub, setSelectedSub] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [loading, setLoading] = useState(false);
  // Holds the target status currently being submitted (or null) — lets each
  // button show its own "...جارٍ" state instead of all of them going dim
  // together with no way to tell which one was actually clicked.
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Permanent deletion of a copyright case is reserved for SUPER_ADMIN.
  const canDelete = can(currentUser?.role, "DELETE_COPYRIGHT_SUBMISSION");

  const handleDelete = async (item, e) => {
    e?.stopPropagation();
    if (!confirm(`حذف نهائي للمعاملة «${item.workTitle}» للمتقدم ${item.applicantName}؟\nسيتم حذف جميع البيانات والوثائق المرفقة ولا يمكن التراجع.`)) {
      return;
    }
    setDeletingId(item.id);
    try {
      const res = await fetch(`/api/admin/copyright-submissions/${item.id}`, { method: "DELETE" });
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== item.id));
        showToast("تم حذف المعاملة نهائياً", "success");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error ?? "فشل حذف المعاملة", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("خطأ بالاتصال بالخادم", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // States for report uploads
  const [uploadedReport, setUploadedReport] = useState(null);
  const [reportFileLabel, setReportFileLabel] = useState("اختر ملف التقرير (PDF أو Word)...");

  // Reset report states when selectedSub changes
  useEffect(() => {
    setUploadedReport(null);
    setReportFileLabel("اختر ملف التقرير (PDF أو Word)...");
  }, [selectedSub]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/copyright-submissions");
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
        // Refresh selected if open
        if (selectedSub) {
          const updated = data.submissions.find(s => s.id === selectedSub.id);
          if (updated) setSelectedSub(updated);
        }
        showToast("تم تحديث البيانات بنجاح", "success");
      }
    } catch (err) {
      console.error(err);
      showToast("خطأ أثناء جلب البيانات", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, applicationStatus, filesPayload = {}) => {
    if (CONFIRM_MESSAGES[applicationStatus] && !confirm(CONFIRM_MESSAGES[applicationStatus])) {
      return;
    }
    setActionLoading(applicationStatus);
    try {
      const res = await fetch(`/api/admin/copyright-submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationStatus, ...filesPayload })
      });
      if (res.ok) {
        const data = await res.json();
        showToast("تم تحديث حالة المعاملة بنجاح", "success");
        // Update local items
        setSubmissions(prev => prev.map(s => s.id === id ? data.submission : s));
        setSelectedSub(data.submission);
        router.refresh();
      } else {
        showToast("فشلت معالجة الطلب", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("خطأ بالاتصال بالخادم", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = submissions.filter((s) => {
    const query = search.toLowerCase();
    const matchSearch = 
      !search || 
      s.applicantName.toLowerCase().includes(query) || 
      s.workTitle.toLowerCase().includes(query) || 
      s.id.toLowerCase().includes(query);
    const matchStatus = filterStatus === "ALL" || s.applicationStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 max-w-sm w-full px-5 py-4 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-3 transition-all ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        }`}>
          <span>{toast.type === "success" ? "✓" : "✕"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="البحث بالاسم، اسم العمل، أو رمز المعاملة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#003D33] focus:ring-2 focus:ring-[#003D33]/10 rounded-xl text-sm outline-none transition text-right"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 md:w-48 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#003D33]"
          >
            <option value="ALL">كل الحالات</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl text-sm transition shrink-0 flex items-center justify-center disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm font-qomra w-full">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 text-sm font-qomra">المعاملات الواردة لحماية حق المؤلف</h2>
          <span className="text-xs font-semibold text-[#003D33] bg-[#003D33]/5 border border-[#003D33]/10 px-2.5 py-1 rounded-full">
            {filtered.length} طلب
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm font-semibold">
            لا توجد طلبات مطابقة للبحث
          </div>
        ) : (
          <>
            {/* Mobile View: Interactive Cards List (< 640px) */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {filtered.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => window.open(`/admin/copyright/${item.id}`, "_blank")}
                  className="p-4 hover:bg-slate-50/80 active:bg-slate-50 transition-colors flex flex-col gap-3 cursor-pointer text-right"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-slate-400">#{shortId(item.id)}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_CLASSES[item.applicationStatus] || ""}`}>
                      {STATUS_LABELS[item.applicationStatus] || item.applicationStatus}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{item.workTitle}</h4>
                    <p className="text-xs text-slate-500 mt-1 flex items-center justify-end gap-1.5">
                      <span>{item.applicantName}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>{CATEGORIES[item.workCategory] || item.workCategory}</span>
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs border-t border-slate-100/50 pt-2.5">
                    <span className="text-slate-400 inline-block" dir="ltr">{formatDate(item.createdAt)}</span>
                    <div className="flex items-center gap-2">
                      {canDelete && (
                        <button
                          onClick={(e) => handleDelete(item, e)}
                          disabled={deletingId === item.id}
                          className="bg-rose-50 text-rose-600 border border-rose-200 text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-rose-100 transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {deletingId === item.id ? "..." : "حذف"}
                        </button>
                      )}
                      <a
                        href={`/admin/copyright/${item.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => { e.stopPropagation(); }}
                        className="bg-[#003D33] text-white text-[11px] font-bold px-3.5 py-1.5 rounded-lg hover:bg-[#002B24] transition cursor-pointer shadow-sm"
                      >
                        معاينة
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Table (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 border-b border-slate-150">
                  <tr>
                    <th className="px-4 py-3 font-bold text-slate-500 text-xs">رمز المعاملة</th>
                    <th className="px-4 py-3 font-bold text-slate-500 text-xs">المقدم</th>
                    <th className="px-4 py-3 font-bold text-slate-500 text-xs">عنوان المصنف</th>
                    <th className="px-4 py-3 font-bold text-slate-500 text-xs hidden md:table-cell">النوع</th>
                    <th className="px-4 py-3 font-bold text-slate-500 text-xs hidden lg:table-cell">تاريخ التقديم</th>
                    <th className="px-4 py-3 font-bold text-slate-500 text-xs">الحالة</th>
                    <th className="px-4 py-3 font-bold text-slate-500 text-xs text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => window.open(`/admin/copyright/${item.id}`, "_blank")}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-500" title={item.id}>
                        {shortId(item.id)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-900 font-semibold">
                        {item.applicantName}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        <span className="line-clamp-1">{item.workTitle}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell text-slate-500 text-xs">
                        {CATEGORIES[item.workCategory] || item.workCategory}
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell text-slate-400 text-xs">
                        <span className="inline-block" dir="ltr">{formatDate(item.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_CLASSES[item.applicationStatus] || ""}`}>
                          {STATUS_LABELS[item.applicationStatus] || item.applicationStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <a
                            href={`/admin/copyright/${item.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => { e.stopPropagation(); }}
                            className="inline-block bg-slate-100 text-slate-800 text-xs font-extrabold px-3 py-1.5 rounded-lg hover:bg-[#003D33] hover:text-white transition cursor-pointer"
                          >
                            معاينة
                          </a>
                          {canDelete && (
                            <button
                              onClick={(e) => handleDelete(item, e)}
                              disabled={deletingId === item.id}
                              title="حذف نهائي"
                              className="inline-flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-200 p-1.5 rounded-lg hover:bg-rose-100 transition cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 font-medium">
          {filtered.length} طلب من أصل {submissions.length}
        </p>
      </div>
    </div>
  );
}
