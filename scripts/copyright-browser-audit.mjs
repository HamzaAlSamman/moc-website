import puppeteer from "puppeteer-core";
import { requireChromiumExecutable } from "../src/lib/chromium-executable.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const base = "http://127.0.0.1:3017";
mkdirSync("tmp/copyright-audit", { recursive: true });
const browser = await puppeteer.launch({ executablePath: requireChromiumExecutable(), headless: true, args: ["--no-sandbox"], defaultViewport: { width: 1440, height: 1000 } });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", err => errors.push(err.message));
  await page.goto(`${base}/ar/services/copyright`, { waitUntil: "networkidle0", timeout: 120000 });
  await page.screenshot({ path: "tmp/copyright-audit/form-ar-desktop.png", fullPage: true });
  console.log(JSON.stringify(await page.evaluate(() => ({
    title: document.title,
    fields: [...document.querySelectorAll("input,select,textarea")].map(e => ({tag:e.tagName,id:e.id,type:e.type,name:e.name,placeholder:e.placeholder,accept:e.accept})),
    buttons: [...document.querySelectorAll("main button")].map(e => ({text:e.innerText,type:e.type})),
    overflow: document.documentElement.scrollWidth > innerWidth,
  })), null, 2));
  console.log(JSON.stringify({ errors }));
  writeFileSync("tmp/copyright-audit/browser-errors.json", JSON.stringify(errors));
  assert.equal(await page.$eval('form button[type="submit"]', e => e.disabled), true, "declaration is required before submit");
  await page.type("#applicantName", "مؤلف الاختبار المحلي فقط");
  await page.type("#applicantPhone", "0912345678");
  await page.type("#applicantEmail", "browser-audit@example.invalid");
  await page.type("#workTitle", "مصنف تجربة المتصفح المحلية");
  await page.type("#workDesc", "هذا مصنف تجريبي للاختبار المحلي ولا يمثل معاملة حقيقية.");
  await page.click('input[name="idDocType"][value="passport"]');
  const fixture = await browser.newPage();
  await fixture.setContent("<html><body>LOCAL COPYRIGHT TEST FIXTURE</body></html>");
  await fixture.pdf({ path: "tmp/copyright-audit/fixture.pdf", format: "A4" });
  await fixture.close();
  const uploads = await page.$$('form input[type="file"]');
  assert.equal(uploads.length, 2, "passport only needs one identity page");
  for (let i = 0; i < uploads.length; i++) {
    const current = await page.$$('form input[type="file"]');
    await current[i].uploadFile(`${process.cwd()}/tmp/copyright-audit/fixture.pdf`);
    await page.waitForFunction(n => document.querySelector("form").innerText.split("fixture.pdf").length >= n + 2, {}, i);
  }
  await page.waitForFunction(() => document.querySelector("form").innerText.split("fixture.pdf").length >= 3);
  const checks = await page.$$('form input[type="checkbox"]');
  await checks.at(-1).click();
  const posts = [];
  page.on("response", async response => {
    if (response.url().endsWith("/api/copyright") && response.request().method() === "POST") {
      posts.push({ status: response.status(), body: await response.json() });
    }
  });
  await page.evaluate(() => { const f=document.querySelector("form"); f.requestSubmit(); f.requestSubmit(); });
  await page.waitForSelector("#paymentRef", { timeout: 30000 });
  await page.waitForNetworkIdle();
  writeFileSync("tmp/copyright-audit/browser-submissions.json", JSON.stringify(posts, null, 2));
  console.log(JSON.stringify({ submitted: posts }));
  assert.equal(posts.length, 1, "double submit must create exactly one application");
} finally { await browser.close(); }
