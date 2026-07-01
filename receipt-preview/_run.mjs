import fs from "node:fs";
import { generateReceiptPdf } from "./_rcpt.mjs";

// Sample submission so you can judge real Arabic content / layout.
const sub = {
  id: "clz9k2x7a0001abcd1234",
  applicantName: "محمد أحمد العلي",
  applicantEmail: "test@example.com",
  workTitle: "ديوان شعري بعنوان أصداء الياسمين الدمشقي",
  workCategory: "written",
  province: "دمشق",
  center: "المركز الرئيسي",
  paymentGateway: "cham_cash",
  paymentRef: "CH-2026-883417",
};

for (const stage of ["initial", "final"]) {
  const pdf = await generateReceiptPdf(sub, { stage });
  const out = `receipt-preview/إيصال-${stage === "final" ? "نهائي" : "أولي"}-v3.pdf`;
  fs.writeFileSync(out, pdf);
  console.log(`${stage}: ${pdf.length} bytes -> ${out}`);
}
console.log("done");
