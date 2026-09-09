import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("receipt assets do not make Turbopack trace the whole project", async () => {
  const source = await readFile(new URL("./receipt-pdf.js", import.meta.url), "utf8");

  for (const assetPath of [
    'path.join(/* turbopackIgnore: true */ process.cwd(), "public", "fonts", "itfQomraArabic-Regular.otf")',
    'path.join(/* turbopackIgnore: true */ process.cwd(), "public", "fonts", "itfQomraArabic-Bold.otf")',
    'path.join(/* turbopackIgnore: true */ process.cwd(), "public", "logo.png")',
    'path.join(/* turbopackIgnore: true */ process.cwd(), "public", "moc-nav-shape.svg")',
  ]) {
    assert.ok(source.includes(assetPath), `missing static receipt asset path: ${assetPath}`);
  }
  assert.doesNotMatch(source, /path\.join\(PUBLIC_DIR,\s*file\)/);
  assert.match(source, /fs\.readFileSync\(\/\* turbopackIgnore: true \*\/ assetPath\)/);
});

// فحص موقع المتصفح انتقل إلى وحدة مشتركة يستخدمها مولّدو الـ PDF الثلاثة،
// لكن الضمان نفسه لم يتغير: `existsSync` هنا فحص وقت تشغيل لمسار نظام، وبدون
// turbopackIgnore يحاول المُجمِّع تتبّعه وقت البناء.
test("the shared chromium probe stays out of Turbopack's trace", async () => {
  const source = await readFile(new URL("./chromium-executable.mjs", import.meta.url), "utf8");
  assert.match(source, /fs\.existsSync\(\/\* turbopackIgnore: true \*\/ candidate\)/);
});
