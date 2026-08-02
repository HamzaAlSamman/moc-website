import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

const numberedCircleFiles = [
  ["app/[locale]/services/copyright/page.js", 6],
  ["app/[locale]/services/submit-event/page.js", 9],
  ["app/[locale]/services/internal-oversight/page.js", 3],
  ["app/[locale]/services/international-cooperation/page.js", 3],
  ["app/[locale]/news/NewsListView.jsx", 1],
  ["components/CulturalCalendarSection.jsx", 1],
  ["components/DateRangePicker.jsx", 1],
  ["components/admin/AdminTopbar.jsx", 1],
  ["components/admin/CopyrightDetailView.jsx", 1],
];

function source(relativePath) {
  return readFileSync(new URL(relativePath, root), "utf8");
}

test("every numbered circle uses the shared optical-alignment utility", () => {
  for (const [relativePath, expectedCount] of numberedCircleFiles) {
    const matches = source(relativePath).match(/\bnumber-circle\b/g) ?? [];
    assert.equal(
      matches.length,
      expectedCount,
      `${relativePath} should contain ${expectedCount} aligned numbered circles`,
    );
  }
});

test("the global number-circle utility defines stable numeric centering", () => {
  const css = source("app/globals.css");

  assert.match(css, /\.number-circle\s*\{/);
  assert.match(css, /font-family:\s*Arial,\s*"Segoe UI",\s*sans-serif/);
  assert.match(css, /line-height:\s*1/);
  assert.match(css, /direction:\s*ltr/);
  assert.match(css, /padding-block-start:\s*1px/);
});

test("copyright portal keeps the latest title and shared hero", () => {
  const copyrightPage = source("app/[locale]/services/copyright/page.js");

  assert.match(copyrightPage, /title:\s*"بوابة حماية حقوق المؤلف"/);
  assert.doesNotMatch(copyrightPage, /بوابة حماية حقوق المؤلف الرقمية/);
  assert.match(copyrightPage, /<SubpageHero[\s\S]*?title=\{t\.title\}/);
});
