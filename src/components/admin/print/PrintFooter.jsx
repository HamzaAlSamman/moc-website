export default function PrintFooter({ printedBy, note }) {
  const printedAt = new Date().toLocaleDateString("ar-SY-u-ca-gregory", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <footer className="print-avoid-break mt-8 border-t border-slate-200 pt-3 text-[10px] leading-relaxed text-slate-500">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>وزارة الثقافة — الجمهورية العربية السورية، دمشق</span>
        <span>
          طُبع بتاريخ {printedAt}
          {printedBy ? ` — بواسطة: ${printedBy}` : ""}
        </span>
      </div>
      {note && <p className="mt-1">{note}</p>}
    </footer>
  );
}
