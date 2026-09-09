import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("shared event artwork renders portrait poster with blurred backdrop", async () => {
  const source = await readFile(new URL("../components/EventArtwork.jsx", import.meta.url), "utf8");

  assert.match(source, /aspect-\[4\/5\]/);
  assert.match(source, /object-contain/);
  assert.match(source, /object-cover/);
  assert.match(source, /blur/);
  assert.match(source, /aria-hidden="true"/);
  assert.match(source, /ImageWithFallback/);
});

test("image fallback forwards preload and eagerly loads its raw fallback", async () => {
  const source = await readFile(new URL("../components/ImageWithFallback.jsx", import.meta.url), "utf8");

  assert.match(source, /preload\s*=\s*false/);
  assert.match(source, /preload=\{preload\}/);
  assert.match(source, /loading=\{preload\s*\|\|\s*priority\s*\?\s*"eager"\s*:\s*"lazy"\}/);
});

test("calendar event images use the shared portrait artwork", async () => {
  const source = await readFile(new URL("../components/CulturalCalendarSection.jsx", import.meta.url), "utf8");

  assert.match(source, /import\s+EventArtwork\s+from\s+["']\.\/EventArtwork["']/);
  assert.ok((source.match(/<EventArtwork\b/g) ?? []).length >= 2);
  assert.doesNotMatch(source, /aspect-\[16\/9\]/);
  assert.doesNotMatch(source, /imageClassName=["'][^"']*group-hover:scale-/);
  assert.match(source, /lg:grid-cols-\[minmax\(0,380px\)_1fr\]/);
});

test("calendar event dialog is keyboard accessible and owns scrolling responsively", async () => {
  const source = await readFile(new URL("../components/CulturalCalendarSection.jsx", import.meta.url), "utf8");

  assert.match(source, /import\s+\{\s*createPortal\s*\}\s+from\s+["']react-dom["']/);
  assert.match(source, /detailEvent\s*&&\s*createPortal\(/);
  assert.match(source, /document\.body\s*\)\s*\}/);
  assert.match(source, /<button\s+type="button"\s+key=\{ev\.id\}/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-labelledby="event-dialog-title"/);
  assert.match(source, /id="event-dialog-title"/);
  assert.match(source, /aria-label=\{isRtl\s*\?\s*"إغلاق نافذة الفعالية"\s*:\s*"Close event dialog"\}/);
  assert.match(source, /eventDialogCloseRef/);
  assert.match(source, /eventDialogOpenerRef\.current\?\.focus\(\)/);
  assert.match(source, /event\.key\s*===\s*"Escape"/);
  assert.match(source, /event\.key\s*!==\s*"Tab"/);
  assert.match(source, /querySelectorAll/);
  assert.match(source, /size-11/);
  assert.match(source, /const previousBodyOverflow = document\.body\.style\.overflow;/);
  assert.match(source, /document\.body\.style\.overflow = "hidden";/);
  assert.match(source, /document\.body\.style\.overflow = previousBodyOverflow;/);
  assert.match(source, /sizes="\(max-width: 639px\) 260px, \(max-width: 1023px\) 320px, 380px"/);
  assert.match(source, /w-\[min\(260px,100%\)\]\s+sm:w-\[min\(320px,100%\)\]\s+lg:w-\[min\(380px,72dvh\)\]/);
  assert.match(source, /max-h-\[90dvh\]\s+overflow-y-auto\s+overscroll-contain\s+lg:grid\s+lg:grid-cols-\[minmax\(0,380px\)_1fr\]\s+lg:overflow-hidden/);
  assert.match(source, /lg:max-h-\[90dvh\]\s+lg:overflow-y-auto\s+lg:overscroll-contain/);
});

test("event detail and related cards use 4:5 artwork", async () => {
  const source = await readFile(new URL("../app/[locale]/events/[id]/page.js", import.meta.url), "utf8");

  assert.match(source, /import\s+EventArtwork\s+from\s+["']@\/components\/EventArtwork["']/);
  assert.ok((source.match(/<EventArtwork\b/g) ?? []).length >= 2);
  assert.doesNotMatch(source, /aspect-\[21\/9\]/);
  assert.doesNotMatch(source, /aspect-\[16\/9\]/);
  assert.doesNotMatch(source, /imageClassName=["'][^"']*group-hover:scale-/);
  assert.match(source, /max-w-\[540px\]/);
});

test("admin event form recommends and previews Instagram portrait artwork", async () => {
  const source = await readFile(new URL("../components/admin/EventForm.jsx", import.meta.url), "utf8");

  assert.match(source, /aspect-\[4\/5\]/);
  assert.match(source, /1080 × 1350/);
  assert.match(source, /object-contain/);
  assert.match(source, /mx-auto/);
  assert.match(source, /max-w-xs/);
  assert.match(source, /bg-\[#003D33\]/);
  assert.match(source, /<button\s+type="button"\s+onClick=\{\(\) => imageInputRef\.current\?\.click\(\)\}/);
  assert.match(source, /aria-label=\{form\.featuredImage\s*\?\s*"تغيير صورة الفعالية"\s*:\s*"رفع صورة الفعالية"\}/);
  assert.match(source, /aria-busy=\{imageUploading\}/);
  assert.match(source, /disabled=\{imageUploading\}/);
  assert.match(source, /focus-visible:ring-2/);
  assert.match(source, /group-focus-visible:opacity-100/);
  assert.match(source, /<\/button>\s*<input\s+ref=\{imageInputRef\}/);
  assert.match(source, /const \[imagePreviewFailed, setImagePreviewFailed\] = useState\(false\)/);
  assert.match(source, /setImagePreviewFailed\(false\)/);
  assert.match(source, /\[form\.featuredImage\]/);
  assert.match(source, /onError=\{\(\) => setImagePreviewFailed\(true\)\}/);
  assert.match(source, /تعذّر عرض الصورة/);
  assert.match(source, /alt="معاينة صورة الفعالية"/);
  assert.doesNotMatch(source, /style\.display/);
});

test("event preview uses shared portrait artwork throughout", async () => {
  const source = await readFile(new URL("../app/[locale]/events/preview/EventPreviewClient.jsx", import.meta.url), "utf8");

  assert.deepEqual(
    {
      importsEventArtwork: /import\s+EventArtwork\s+from\s+["']@\/components\/EventArtwork["']/.test(source),
      usesEventArtworkAtLeastTwice: (source.match(/<EventArtwork\b/g) ?? []).length >= 2,
      containsPanoramicArtwork: /aspect-\[(?:21|16)\/9\]/.test(source),
      capsMainArtworkAt540px: /max-w-\[540px\]/.test(source),
      scalesForegroundArtworkOnHover: /imageClassName=["'][^"']*group-hover:scale-/.test(source),
    },
    {
      importsEventArtwork: true,
      usesEventArtworkAtLeastTwice: true,
      containsPanoramicArtwork: false,
      capsMainArtworkAt540px: true,
      scalesForegroundArtworkOnHover: false,
    },
  );
  assert.match(
    source,
    /<div className="mx-auto aspect-\[4\/5\] w-full max-w-\[540px\] bg-slate-200 rounded-3xl mb-8"/,
  );
  assert.match(
    source,
    /<EventArtwork\s+src=\{event\.heroImage\?\.url\}\s+alt=\{event\.heroImage\?\.alt \|\| title\}\s+preload\s+sizes="\(max-width: 639px\) calc\(100vw - 2rem\), 540px"/,
  );
  assert.match(source, /<span className="absolute top-3 right-3 z-20 bg-white\/90/);
});
