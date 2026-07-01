import { readFileSync } from "fs";

const adminSource = readFileSync("src/components/admin/CopyrightDetailView.jsx", "utf8");
const publicSource = readFileSync("src/app/[locale]/services/copyright/page.js", "utf8");

const checks = [
  {
    name: "admin tracks the selected copyright attachment preview",
    pass: adminSource.includes("imagePreview") && adminSource.includes("setImagePreview"),
  },
  {
    name: "admin renders the image preview through a full-viewport body portal",
    pass:
      adminSource.includes("createPortal") &&
      adminSource.includes('role="dialog"') &&
      adminSource.includes("fixed inset-0") &&
      adminSource.includes("z-[9999]") &&
      adminSource.includes("aria-modal"),
  },
  {
    name: "admin opens image attachments through a click handler instead of target blank links",
    pass: adminSource.includes("onPreviewImage") && !adminSource.includes('target="_blank" rel="noopener noreferrer"'),
  },
  {
    name: "public copyright page tracks receipt image previews",
    pass: publicSource.includes("imagePreview") && publicSource.includes("setImagePreview"),
  },
  {
    name: "public copyright page renders the receipt preview through a full-viewport body portal",
    pass:
      publicSource.includes("createPortal") &&
      publicSource.includes('role="dialog"') &&
      publicSource.includes("fixed inset-0") &&
      publicSource.includes("z-[9999]") &&
      publicSource.includes("aria-modal"),
  },
  {
    name: "public copyright receipt thumbnails open in the lightbox",
    pass:
      publicSource.includes("setImagePreview({ src: trackPaymentReceipt") &&
      publicSource.includes("setImagePreview({ src: paymentReceipt"),
  },
];

const failed = checks.filter((check) => !check.pass);

if (failed.length) {
  console.error("Copyright attachment preview check failed:");
  for (const check of failed) {
    console.error(`- ${check.name}`);
  }
  process.exit(1);
}

console.log("Copyright attachment preview check passed.");
