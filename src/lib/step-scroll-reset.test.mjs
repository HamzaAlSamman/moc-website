import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

// كل معالج متعدد الخطوات في الخدمات يجب أن يعيد الصفحة إلى أعلاها عند
// الانتقال بين الخطوات. الأزرار في أسفل خطوات طويلة، فبدون ذلك يبقى
// المستخدم عند أسفل الصفحة ويظن أن الضغط لم يفعل شيئاً.
//
// الاختبار يبحث عن الملفات التي تدير حالة خطوات فعلاً (setStep) ويطالبها
// جميعاً باستخدام الخطّاف المشترك — حتى لا يصل معالج جديد للإنتاج ناسياً
// السلوك الذي اشتكى منه المستخدمون مرتين.

const SRC = path.join(process.cwd(), "src");

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(js|jsx)$/.test(entry.name) && !entry.name.includes(".test.") ? [full] : [];
  });
}

test("every multi-step service wizard resets scroll between steps", () => {
  const files = sourceFiles(path.join(SRC, "app"));

  const wizards = files.filter((file) => {
    const source = readFileSync(file, "utf8");
    // معالج حقيقي: يملك حالة خطوة ويغيّرها في أكثر من موضع.
    return /const \[step, setStep\] = useState\(/.test(source)
      && (source.match(/setStep\(/g) || []).length >= 2;
  });

  assert.ok(wizards.length >= 3, `expected to find the service wizards, found ${wizards.length}`);

  const missing = wizards
    .filter((file) => !readFileSync(file, "utf8").includes("useStepScrollReset"))
    .map((file) => path.relative(SRC, file));

  assert.deepEqual(missing, [], "these wizards change step without resetting scroll");
});

test("the shared hook scrolls to the top and skips the first render", () => {
  const hook = readFileSync(path.join(SRC, "lib", "use-step-scroll-reset.js"), "utf8");

  assert.match(hook, /window\.scrollTo\(\{\s*top:\s*0/, "must scroll to the top of the page");
  assert.match(hook, /mountedRef/, "must skip the initial render rather than jumping on mount");
  // بدون preventScroll يُلغي نقلُ التركيز التمريرَ الذي نُفّذ للتو.
  assert.match(hook, /focus\?\.\(\{ preventScroll: true \}\)/, "focus must not undo the scroll");
  assert.match(hook, /\[step, focusRef\]/, "effect must re-run when the step changes");
});
