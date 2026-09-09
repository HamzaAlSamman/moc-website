"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, ScanLine } from "lucide-react";

const RESULT_MESSAGE = {
  BOOKING_NOT_CONFIRMED: "الحجز غير مؤكد، لا يمكن تسجيل الحضور",
  BOOKING_NOT_FOUND: "الحجز غير موجود",
  CODE_MISMATCH: "رمز التحقق لا يطابق هذه التذكرة",
  TAMPERED: "بيانات التذكرة غير متطابقة مع توقيعها",
  CANCELLED: "التذكرة ملغاة",
  WAITLISTED: "صاحب التذكرة على قائمة الانتظار",
};

export default function TicketCheckInPanel({ referenceNo, code, initialAttendance }) {
  const [state, setState] = useState(initialAttendance === "ATTENDED" ? "done" : "idle");
  const [message, setMessage] = useState(
    initialAttendance === "ATTENDED" ? "الحضور مسجّل مسبقاً لهذه التذكرة" : "",
  );

  async function checkIn() {
    setState("busy");
    setMessage("");
    try {
      const response = await fetch("/api/admin/tickets/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceNo, code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.checkedIn) {
        setState("error");
        setMessage(data.error || RESULT_MESSAGE[data.result] || "تعذر تسجيل الحضور");
        return;
      }
      setState("done");
      setMessage(data.alreadyCheckedIn ? "الحضور مسجّل مسبقاً لهذه التذكرة" : "تم تسجيل الحضور بنجاح");
    } catch {
      setState("error");
      setMessage("تعذر الاتصال بالخادم");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <CheckCircle2 className="mx-auto text-emerald-600" size={34} />
        <p className="mt-2 text-base font-black text-emerald-800">{message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={checkIn}
        disabled={state === "busy"}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#003D33] px-6 text-base font-black text-white transition hover:bg-[#002b24] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A48E68] focus-visible:ring-offset-2"
      >
        {state === "busy" ? <Loader2 className="animate-spin" size={20} /> : <ScanLine size={20} />}
        {state === "busy" ? "جارٍ التسجيل..." : "تسجيل حضور صاحب التذكرة"}
      </button>
      {message && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700">
          {message}
        </p>
      )}
    </div>
  );
}
