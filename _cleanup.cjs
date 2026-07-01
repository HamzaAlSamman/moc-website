const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const DOCS = ["workFile","idFile","telecomFile","roleFile","commercialRegisterFile","delegationFile","representativeIdFile","originalOwnerIdFile"];
(async () => {
  const all = await p.copyrightSubmission.findMany({ orderBy: { createdAt: "desc" } });
  console.log("إجمالي السجلّات:", all.length, "\n");
  const empty = [];
  for (const s of all) {
    const docCount = DOCS.filter((f) => s[f]).length;
    const authorDocs = Array.isArray(s.authors) ? s.authors.filter((a) => a && a.file).length : 0;
    const tag = (docCount === 0 && authorDocs === 0) ? "🗑️ EMPTY" : "✅ KEEP ";
    const line = [s.id.slice(-8), String(s.applicantName).slice(0,18).padEnd(18), "status:"+String(s.applicationStatus).padEnd(16), "docs:"+docCount, "authorDocs:"+authorDocs, "receipt:"+(s.paymentReceipt?"y":"n")].join(" | ");
    console.log(tag, line);
    if (docCount === 0 && authorDocs === 0) empty.push(s.id);
  }
  console.log("\nسيُحذف:", empty.length);
  if (process.argv[2] === "--delete" && empty.length) {
    const r = await p.copyrightSubmission.deleteMany({ where: { id: { in: empty } } });
    console.log("✔ تم حذف:", r.count, "سجل");
  } else {
    console.log("(معاينة فقط — لم يُحذف شيء)");
  }
  process.exit(0);
})();
