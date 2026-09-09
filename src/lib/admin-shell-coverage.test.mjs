import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

// The admin area has no nested layout that supplies the chrome: src/app/admin
// /layout.js renders only <html>/<body>, so every page must wrap itself in
// AdminShell. A page that forgets still renders and still queries fine — it
// just loses the sidebar, the topbar and the content container, which is how
// the legal-licenses screens shipped looking like a different product.

const ADMIN_DIR = path.join(process.cwd(), "src", "app", "admin");

// Screens that are deliberately chrome-free.
const SHELL_EXEMPT = new Set([
  "page.js", // redirects to /admin/dashboard
  path.join("login", "page.js"),
  path.join("event-submissions", "print", "page.js"),
  path.join("event-submissions", "[id]", "print", "page.js"),
  path.join("posts", "[id]", "preview", "page.js"),
]);

function adminPages(dir = ADMIN_DIR) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return adminPages(full);
    return entry.name === "page.js" ? [full] : [];
  });
}

test("every admin screen renders inside AdminShell", () => {
  const pages = adminPages();
  assert.ok(pages.length > 20, "expected to find the admin page tree");

  const missing = pages
    .map((file) => path.relative(ADMIN_DIR, file))
    .filter((relative) => !SHELL_EXEMPT.has(relative))
    .filter((relative) => !readFileSync(path.join(ADMIN_DIR, relative), "utf8").includes("AdminShell"));

  assert.deepEqual(missing, []);
});

test("the exemption list stays honest about which files exist", () => {
  const present = new Set(adminPages().map((file) => path.relative(ADMIN_DIR, file)));
  for (const exempt of SHELL_EXEMPT) {
    assert.ok(present.has(exempt), `exempt page no longer exists: ${exempt}`);
  }
});
