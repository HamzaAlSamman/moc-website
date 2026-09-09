"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CameraOff,
  CheckCircle2,
  Keyboard,
  Loader2,
  QrCode,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  Undo2,
  Zap,
} from "lucide-react";

// The ministry's own reader. A ticket QR no longer carries a URL — it carries
// an encrypted payload (src/lib/ticket-scan-payload.mjs) that only this screen,
// behind a SCAN_EVENT_TICKETS session, can turn back into a booking.
//
// Decoding happens entirely in the browser; the payload is then posted to
// /api/admin/tickets/scan, which alone holds the key. Two taps per visitor:
// scan reads the ticket, the officer compares the name to the ID document, and
// only then does "تسجيل الدخول" commit.

const FIELD =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base tracking-wider text-slate-900 outline-none transition focus:border-[#A48E68] focus:ring-2 focus:ring-[#A48E68]/20";

const RESULT_COPY = {
  VALID: { tone: "ok", title: "تذكرة صالحة", body: "طابق الاسم مع الوثيقة الثبوتية قبل تسجيل الدخول." },
  UNREADABLE: {
    tone: "bad",
    title: "رمز غير صادر عن الوزارة",
    body: "هذا الرمز ليس تذكرة صادرة عن وزارة الثقافة، أو أنه تالف. جرّب الإدخال اليدوي.",
  },
  NOT_FOUND: { tone: "bad", title: "تذكرة غير معروفة", body: "لا يوجد حجز بهذا الرقم المرجعي." },
  CODE_MISMATCH: { tone: "bad", title: "رمز التحقق غير مطابق", body: "الرقم المرجعي موجود لكن الرمز لا يخصّه." },
  TAMPERED: { tone: "bad", title: "بيانات غير متطابقة", body: "توقيع التذكرة لا يطابق بياناتها. أبلغ إدارة الفعالية." },
  CANCELLED: { tone: "bad", title: "تذكرة ملغاة", body: "التذكرة أصلية لكن حجزها ملغى — غير مصرح بالدخول." },
  WAITLISTED: { tone: "warn", title: "على قائمة الانتظار", body: "الحجز غير مثبّت بعد — راجع إدارة الفعالية." },
  BOOKING_NOT_CONFIRMED: { tone: "bad", title: "الحجز غير مؤكد", body: "لا يمكن تسجيل الدخول لهذا الحجز." },
  BOOKING_NOT_FOUND: { tone: "bad", title: "الحجز غير موجود", body: "تعذر العثور على الحجز عند التسجيل." },
  CHECK_IN_NOT_YOURS: {
    tone: "warn",
    title: "التسجيل ليس من حسابك",
    body: "سجّل هذا الدخول موظف آخر — راجع إدارة الفعالية للتراجع عنه.",
  },
};

const TONE = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  bad: "border-red-200 bg-red-50 text-red-900",
};

const ATTENDANCE_AR = {
  NOT_CHECKED_IN: "لم يُسجّل الحضور بعد",
  ATTENDED: "تم تسجيل الحضور",
  NO_SHOW: "تغيّب عن الفعالية",
};

function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Damascus",
  }).format(new Date(value));
}

export default function TicketScanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const decoderRef = useRef(null);
  const loopRef = useRef(0);
  // Read inside the animation loop, which closes over its first render.
  const scanningRef = useRef(false);

  const [cameraState, setCameraState] = useState("off"); // off | starting | on | blocked | unsupported
  const [cameraError, setCameraError] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ referenceNo: "", code: "" });
  const [busy, setBusy] = useState("");
  const [scan, setScan] = useState(null); // { result, admissible, ticket }
  const [checkIn, setCheckIn] = useState(null); // { ok, message }

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    cancelAnimationFrame(loopRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorchOn(false);
    setTorchAvailable(false);
    setCameraState("off");
  }, []);

  // Releasing the camera on unmount matters more than usual here: these
  // accounts run on shared phones that stay open at a door all evening.
  useEffect(() => stopCamera, [stopCamera]);

  const submitScan = useCallback(async (body) => {
    setBusy("scan");
    setCheckIn(null);
    try {
      const response = await fetch("/api/admin/tickets/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (data.result) setScan(data);
      else setScan({ result: "UNREADABLE", admissible: false, ticket: null, error: data.error });
    } catch {
      setScan({ result: "UNREADABLE", admissible: false, ticket: null, error: "تعذر الاتصال بالخادم" });
    } finally {
      setBusy("");
    }
  }, []);

  // One decoded QR per result screen: the loop stops the moment it reads
  // something, so a ticket left in front of the lens is not re-posted.
  const onDecoded = useCallback(
    (text) => {
      scanningRef.current = false;
      cancelAnimationFrame(loopRef.current);
      stopCamera();
      submitScan({ payload: text });
    },
    [stopCamera, submitScan],
  );

  const startCamera = useCallback(async () => {
    setScan(null);
    setCheckIn(null);
    setCameraError("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      return;
    }
    setCameraState("starting");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (error) {
      // NotAllowedError is a denied permission; the rest are "no usable
      // camera". Both leave manual entry as the way through.
      setCameraState(error?.name === "NotAllowedError" ? "blocked" : "unsupported");
      setCameraError(error?.name === "NotAllowedError" ? "" : "تعذر تشغيل الكاميرا على هذا الجهاز.");
      return;
    }

    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    video.srcObject = stream;
    // playsInline is set on the element too; iOS otherwise takes the video
    // fullscreen and the officer loses the surrounding screen.
    await video.play().catch(() => {});

    const track = stream.getVideoTracks()[0];
    setTorchAvailable(Boolean(track?.getCapabilities?.().torch));

    // BarcodeDetector is native on the Android phones this is meant for.
    // Everywhere else (notably iOS Safari) jsQR is pulled in on demand, so the
    // decoder never ships to browsers that do not need it.
    if (!detectorRef.current && !decoderRef.current) {
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
        } catch {
          detectorRef.current = null;
        }
      }
      if (!detectorRef.current) {
        decoderRef.current = (await import("jsqr")).default;
      }
    }

    setCameraState("on");
    scanningRef.current = true;

    let lastAttempt = 0;
    const tick = async (now) => {
      if (!scanningRef.current) return;
      loopRef.current = requestAnimationFrame(tick);
      // ~8 decode attempts a second: enough to feel instant, cheap enough not
      // to cook a phone held at a door for three hours.
      if (now - lastAttempt < 120) return;
      lastAttempt = now;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

      try {
        if (detectorRef.current) {
          const [found] = await detectorRef.current.detect(video);
          if (found?.rawValue) onDecoded(found.rawValue);
          return;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        if (!canvas.width || !canvas.height) return;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        const found = decoderRef.current(frame.data, frame.width, frame.height, {
          inversionAttempts: "dontInvert",
        });
        if (found?.data) onDecoded(found.data);
      } catch {
        // A dropped frame is not worth interrupting the loop for.
      }
    };
    loopRef.current = requestAnimationFrame(tick);
  }, [onDecoded]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
    }
  }

  function submitManual(event) {
    event.preventDefault();
    const referenceNo = manual.referenceNo.trim();
    const code = manual.code.trim();
    if (!referenceNo || !code) return;
    stopCamera();
    submitScan({ referenceNo, code });
  }

  async function commitCheckIn() {
    const ticket = scan?.ticket;
    if (!ticket) return;
    setBusy("check-in");
    try {
      const response = await fetch("/api/admin/tickets/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceNo: ticket.referenceNo, code: ticket.code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.checkedIn) {
        setCheckIn({
          ok: false,
          message: data.error || RESULT_COPY[data.result]?.title || "تعذر تسجيل الدخول",
        });
        return;
      }
      setCheckIn({
        ok: true,
        message: data.alreadyCheckedIn ? "الدخول مسجّل مسبقاً لهذه التذكرة" : "تم تسجيل الدخول بنجاح",
      });
    } catch {
      setCheckIn({ ok: false, message: "تعذر الاتصال بالخادم" });
    } finally {
      setBusy("");
    }
  }

  // The wrong ticket scanned in a queue is a slip that has to be fixable on
  // the spot; the server only lets a door account reverse a check-in it made
  // itself, so the officer can fix their own mistake and nothing more.
  async function revertCheckIn() {
    const ticket = scan?.ticket;
    if (!ticket) return;
    setBusy("undo");
    try {
      const response = await fetch("/api/admin/tickets/check-in", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceNo: ticket.referenceNo, code: ticket.code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.reverted) {
        setCheckIn({
          ok: false,
          message: data.error || RESULT_COPY[data.result]?.body || "تعذر التراجع عن تسجيل الدخول",
        });
        return;
      }
      // Back to the pre-check-in state so the officer can scan the right
      // ticket next, or re-admit this one if the undo was itself the mistake.
      setScan((current) => ({
        ...current,
        ticket: { ...current.ticket, attendanceStatus: "NOT_CHECKED_IN", checkedInAt: null },
      }));
      setCheckIn({ ok: false, message: "تم التراجع — لم يُسجَّل دخول لهذه التذكرة" });
    } catch {
      setCheckIn({ ok: false, message: "تعذر الاتصال بالخادم" });
    } finally {
      setBusy("");
    }
  }

  function reset() {
    setScan(null);
    setCheckIn(null);
    setManual({ referenceNo: "", code: "" });
  }

  const copy = scan ? RESULT_COPY[scan.result] ?? { tone: "bad", title: scan.result, body: "" } : null;
  const ticket = scan?.ticket;
  const alreadyIn = ticket?.attendanceStatus === "ATTENDED";

  return (
    <div className="space-y-4" dir="rtl">
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Viewfinder ─────────────────────────────────────────────────── */}
      {!scan && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative aspect-[4/3] w-full bg-slate-900">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover ${cameraState === "on" ? "" : "opacity-0"}`}
            />

            {cameraState === "on" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-52 w-52 rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            )}

            {cameraState !== "on" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
                {cameraState === "starting" ? (
                  <>
                    <Loader2 className="animate-spin" size={30} />
                    <p className="text-sm font-bold">جارٍ تشغيل الكاميرا…</p>
                  </>
                ) : cameraState === "blocked" ? (
                  <>
                    <CameraOff size={30} className="text-amber-300" />
                    <p className="text-sm font-bold">تم رفض إذن الكاميرا</p>
                    <p className="max-w-xs text-xs leading-6 text-white/70">
                      اسمح للموقع بالوصول إلى الكاميرا من إعدادات المتصفح، أو استخدم الإدخال اليدوي أدناه.
                    </p>
                  </>
                ) : cameraState === "unsupported" ? (
                  <>
                    <CameraOff size={30} className="text-amber-300" />
                    <p className="text-sm font-bold">الكاميرا غير متاحة</p>
                    <p className="max-w-xs text-xs leading-6 text-white/70">
                      {cameraError || "استخدم الإدخال اليدوي أدناه."} تشغيل الكاميرا يتطلب اتصالاً آمناً (HTTPS).
                    </p>
                  </>
                ) : (
                  <>
                    <QrCode size={34} className="text-white/70" />
                    <p className="max-w-xs text-sm font-bold leading-6">
                      وجّه الكاميرا إلى رمز التذكرة — الرمز مشفّر ولا يُقرأ إلا من هذه الشاشة.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-100 p-4">
            {cameraState === "on" ? (
              <>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="min-h-12 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  إيقاف الكاميرا
                </button>
                {torchAvailable && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    aria-pressed={torchOn}
                    className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black transition ${
                      torchOn
                        ? "border-amber-300 bg-amber-50 text-amber-800"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Zap size={17} />
                    الإضاءة
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={startCamera}
                disabled={cameraState === "starting" || busy === "scan"}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#003D33] px-6 text-base font-black text-white transition hover:bg-[#002b24] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A48E68] focus-visible:ring-offset-2"
              >
                {busy === "scan" ? <Loader2 className="animate-spin" size={20} /> : <ScanLine size={20} />}
                {busy === "scan" ? "جارٍ التدقيق…" : "بدء المسح"}
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── Result ─────────────────────────────────────────────────────── */}
      {scan && copy && (
        <section className="space-y-4">
          <div className={`rounded-2xl border p-5 ${TONE[copy.tone]}`}>
            <p className="flex items-center gap-2 text-lg font-black">
              {copy.tone === "ok" ? <CheckCircle2 size={22} /> : copy.tone === "warn" ? <AlertTriangle size={22} /> : <ShieldAlert size={22} />}
              {copy.title}
            </p>
            <p className="mt-1 text-sm font-bold leading-6 opacity-90">{scan.error || copy.body}</p>
          </div>

          {ticket && (
            <dl className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {[
                ["اسم صاحب التذكرة", ticket.fullName],
                ["الرقم الوطني", `ينتهي بـ ${ticket.nationalIdLast4}`],
                ["الفعالية", ticket.event?.titleAr],
                ["موعد الفعالية", formatDateTime(ticket.event?.startDate)],
                ["المكان", ticket.event?.location || "—"],
                ["الرقم المرجعي", ticket.referenceNo],
                ["حالة الحضور", ATTENDANCE_AR[ticket.attendanceStatus] || "—"],
                ...(ticket.checkedInAt ? [["وقت التسجيل", formatDateTime(ticket.checkedInAt)]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3 border-b border-slate-100 px-5 py-3 last:border-b-0">
                  <dt className="w-32 shrink-0 text-xs font-bold text-slate-500">{label}</dt>
                  <dd className="min-w-0 flex-1 text-sm font-black text-slate-900">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          )}

          {checkIn && (
            <div className="space-y-2">
              <p
                aria-live="polite"
                className={`rounded-xl border px-4 py-3 text-center text-sm font-black ${
                  checkIn.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {checkIn.message}
              </p>
              {checkIn.ok && (
                <button
                  type="button"
                  onClick={revertCheckIn}
                  disabled={busy === "undo"}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {busy === "undo" ? <Loader2 className="animate-spin" size={17} /> : <Undo2 size={17} />}
                  {busy === "undo" ? "جارٍ التراجع…" : "تراجع — سجّلت الشخص الخطأ"}
                </button>
              )}
            </div>
          )}

          {scan.admissible && !checkIn?.ok && (
            <>
              {alreadyIn && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-black text-amber-800">
                  تنبيه: سبق تسجيل الدخول بهذه التذكرة{ticket.checkedInAt ? ` في ${formatDateTime(ticket.checkedInAt)}` : ""}.
                </p>
              )}
              <button
                type="button"
                onClick={commitCheckIn}
                disabled={busy === "check-in"}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#003D33] px-6 text-base font-black text-white transition hover:bg-[#002b24] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A48E68] focus-visible:ring-offset-2"
              >
                {busy === "check-in" ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                {busy === "check-in" ? "جارٍ التسجيل…" : "تسجيل دخول الزائر"}
              </button>
            </>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                reset();
                startCamera();
              }}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#A48E68] px-4 text-sm font-black text-[#002723] transition hover:bg-[#988561]"
            >
              <ScanLine size={18} />
              مسح تذكرة أخرى
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw size={17} />
              إنهاء
            </button>
          </div>
        </section>
      )}

      {/* ── Manual fallback ────────────────────────────────────────────── */}
      {!scan && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setManualOpen((open) => !open)}
            aria-expanded={manualOpen}
            className="flex min-h-12 w-full items-center justify-between gap-2 px-5 text-sm font-black text-slate-800"
          >
            <span className="flex items-center gap-2">
              <Keyboard size={18} className="text-[#006455]" />
              إدخال يدوي (تذكرة تالفة أو تعذّر المسح)
            </span>
            <span className="text-xs font-bold text-slate-400">{manualOpen ? "إخفاء" : "إظهار"}</span>
          </button>
          {manualOpen && (
            <form onSubmit={submitManual} className="space-y-4 border-t border-slate-100 p-5">
              <div>
                <label htmlFor="ticket-ref" className="mb-1.5 block text-sm font-bold text-slate-700">
                  الرقم المرجعي
                </label>
                <input
                  id="ticket-ref"
                  value={manual.referenceNo}
                  onChange={(event) => setManual((current) => ({ ...current, referenceNo: event.target.value }))}
                  placeholder="BKG-2026-0001"
                  dir="ltr"
                  autoComplete="off"
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="ticket-code" className="mb-1.5 block text-sm font-bold text-slate-700">
                  رمز التحقق
                </label>
                <input
                  id="ticket-code"
                  value={manual.code}
                  onChange={(event) => setManual((current) => ({ ...current, code: event.target.value }))}
                  placeholder="K7RVT-Q4N2M"
                  dir="ltr"
                  autoComplete="off"
                  autoCapitalize="characters"
                  className={FIELD}
                />
              </div>
              <button
                type="submit"
                disabled={busy === "scan"}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#003D33] px-6 text-base font-black text-white transition hover:bg-[#002b24] disabled:opacity-60"
              >
                {busy === "scan" ? <Loader2 className="animate-spin" size={18} /> : <ScanLine size={18} />}
                تدقيق التذكرة
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
