/* eslint-disable @next/next/no-img-element */
// Official MOC letterhead used at the top of every printable admin report.
// Plain <img> (not next/image) so the printed sheet renders the asset at its
// natural size without the optimizer's responsive wrapper.

export default function PrintLetterhead({ docTitle, docSubtitle, badge }) {
  return (
    <header className="print-avoid-break mb-6 border-b-[3px] border-[#B9A779]">
      <div className="flex items-center gap-4 rounded-t-lg bg-[#002723] px-6 py-4 text-white">
        <img
          src="/logo.png"
          alt="شعار وزارة الثقافة"
          className="h-16 w-16 rounded-lg bg-white object-contain p-1"
        />
        <div className="flex-1 text-center">
          <h1 className="text-lg font-black tracking-wide">الجمهورية العربية السورية</h1>
          <p className="mt-1 text-sm font-bold text-[#B9A779]">
            وزارة الثقافة — مديرية الفعاليات والأنشطة الثقافية
          </p>
        </div>
        {/* Mirror of the logo box: keeps the titles optically centred. */}
        <div className="h-16 w-16 shrink-0" aria-hidden="true" />
      </div>

      <div className="flex items-center justify-between gap-4 bg-[#fbf9f6] px-6 py-3">
        <div>
          <h2 className="text-base font-black text-[#002723]">{docTitle}</h2>
          {docSubtitle && (
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{docSubtitle}</p>
          )}
        </div>
        {badge && (
          <span className="shrink-0 rounded-lg border-b-2 border-[#B9A779] bg-[#0a3c34] px-3 py-2 text-[11px] font-bold text-white">
            {badge}
          </span>
        )}
      </div>
    </header>
  );
}
