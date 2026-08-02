import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("./page.js", import.meta.url), "utf8");

test("copyright page derives fees after form state exists", () => {
  const formStateIndex = source.indexOf("const [form, setForm] = useState(INITIAL_FORM);");
  const feesIndex = source.indexOf("const fees = getFeesForRole(form.applicantRole);");

  assert.notEqual(formStateIndex, -1);
  assert.notEqual(feesIndex, -1);
  assert.ok(formStateIndex < feesIndex);
});

test("Arabic applicant role options use display labels without changing stored values", () => {
  assert.equal(source.includes('{ ar: "المؤلف", labelAr: "مؤلف", en: "Author" }'), true);
  assert.equal(source.includes("value={role.ar}"), true);
  assert.equal(source.includes("{isRtl ? role.labelAr : role.en}"), true);
});

test("Arabic Google Drive copy is translated and the URL field stays LTR", () => {
  assert.equal(
    source.includes('isRtl ? "رابط غوغل درايف للمصنفات التي يتجاوز حجمها 100 ميغابايت" : "Google Drive URL for works larger than 100 MiB"'),
    true,
  );
  assert.match(source, /value=\{workDriveUrl\}[\s\S]*?dir="ltr"[\s\S]*?className="[^"]*text-left[^"]*"/);
  assert.equal(source.includes('isRtl ? "يُسمح برفع ملفات ZIP فقط" : "Only ZIP files are allowed"'), true);
  assert.equal(source.includes('isRtl ? "يتجاوز ملف ZIP حجم 100 ميغابايت؛ استخدم غوغل درايف" : "ZIP exceeds 100 MiB; use Google Drive"'), true);
});