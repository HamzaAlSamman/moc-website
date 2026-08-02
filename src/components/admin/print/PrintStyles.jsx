// Shared print CSS for the admin printable reports.
//
// The printed output is produced by the browser's own print dialog (Ctrl+P →
// "Save as PDF"), not by a headless Chromium on the server: the host is memory
// constrained and already serializes one Chromium for copyright receipts, so
// adding a second PDF pipeline for a document the operator is looking at anyway
// would be wasteful. The rules below pin an A4 sheet, hide the screen-only
// toolbar, keep backgrounds (print-color-adjust) and stop rows/sections from
// splitting across pages.

export default function PrintStyles() {
  return (
    <style>{`
      .print-root {
        --moc-green: #002723;
        --moc-gold: #B9A779;
        color: #1f2a28;
      }
      .print-sheet {
        background: #fff;
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 12mm 14mm 16mm;
        box-shadow: 0 4px 24px rgba(0,0,0,.10);
      }
      .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }

      @media print {
        @page { size: A4; margin: 10mm 8mm 14mm; }
        html, body {
          background: #fff !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .no-print { display: none !important; }
        .print-root { padding: 0 !important; background: #fff !important; }
        .print-sheet {
          width: auto;
          min-height: 0;
          margin: 0;
          padding: 0;
          box-shadow: none;
        }
        thead { display: table-header-group; }
        tr, .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
      }
    `}</style>
  );
}
