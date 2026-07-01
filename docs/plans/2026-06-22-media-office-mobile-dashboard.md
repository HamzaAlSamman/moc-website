# Media Office Mobile Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the post/achievement editor and the posts/achievements list table — the two shared surfaces the `MEDIA_OFFICE` role (and every other content role) actually works in on a phone — fully usable at 375px width: a reachable publish bar, touch-usable gallery controls, and a card-based list instead of a horizontally-scrolling table.

**Architecture:** Three existing client components get a second, Tailwind-gated (`md:hidden` / `hidden md:block`) render path for the same data and handlers they already have — no new state, no new props, no API/route changes. This mirrors how `AdminShell` already switches its sidebar to a drawer below `md`.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS. No automated test framework in this project — verification is `npx next build` plus manual checks via the Claude Preview MCP tool at a 375px viewport.

**Design doc:** `docs/plans/2026-06-21-media-office-mobile-dashboard-design.md`

---

### Task 1: Sticky mobile publish bar — PostForm.jsx

**Files:**
- Modify: `src/components/admin/PostForm.jsx`

**Step 1: Add bottom padding to the outer wrapper so the fixed bar never covers the last field**

Find (currently line 471):
```jsx
    <div className="space-y-6">
```
Replace with:
```jsx
    <div className="space-y-6 pb-24 md:pb-0">
```

**Step 2: Add the sticky mobile action bar**

Find the end of the component (currently lines 920-931):
```jsx
                <FolderOpen className="w-8 h-8 text-gray-400 mb-1" />
                <p className="text-xs font-bold text-gray-600">اضغط لإضافة صور للمعرض</p>
                <p className="text-[10px] text-gray-400">يمكنك اختيار أكثر من صورة دفعة واحدة</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
```
Replace with:
```jsx
                <FolderOpen className="w-8 h-8 text-gray-400 mb-1" />
                <p className="text-xs font-bold text-gray-600">اضغط لإضافة صور للمعرض</p>
                <p className="text-[10px] text-gray-400">يمكنك اختيار أكثر من صورة دفعة واحدة</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile sticky publish bar — same handlers as the sidebar's "النشر" card above,
          just promoted to a fixed bar so they're reachable without scrolling past the
          whole article body on a phone. */}
      <div className="fixed bottom-0 inset-x-0 z-30 flex gap-2 border-t border-gray-200 bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:hidden">
        {canPublish ? (
          <>
            <button
              type="button"
              onClick={() => handleSave("DRAFT")}
              disabled={saving}
              className="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saving ? "جاري الحفظ..." : "حفظ كمسودة"}
            </button>
            <button
              type="button"
              onClick={() => handleSave("PUBLISHED")}
              disabled={saving}
              className="flex-1 rounded-lg py-2.5 text-sm font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{ background: "#003D33" }}
            >
              <Globe className="w-4 h-4" />
              {saving ? "جاري الحفظ..." : form.status === "PUBLISHED" ? "حفظ التغييرات" : "نشر فوراً"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handleSave("DRAFT")}
              disabled={saving}
              className="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saving ? "جاري الحفظ..." : "حفظ كمسودة"}
            </button>
            <button
              type="button"
              onClick={() => handleSave("PENDING_REVIEW")}
              disabled={saving}
              className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Send className="w-4 h-4 ltr:-scale-x-100" />
              {saving ? "جاري الإرسال..." : "إرسال للمراجعة"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

`Save`, `Globe`, and `Send` are already imported at the top of this file — no new imports needed.

**Step 3: Verify**

Run: `cd "F:\تطبيقات انا عم اعملها\MOC\moc-website" && npx next build`
Expected: `✓ Compiled successfully`.

---

### Task 2: Sticky mobile publish bar — AchievementForm.jsx

**Files:**
- Modify: `src/components/admin/AchievementForm.jsx`

**Step 1: Add bottom padding to the outer wrapper**

Find (currently line 491):
```jsx
    <div className="space-y-6" dir="rtl">
```
Replace with:
```jsx
    <div className="space-y-6 pb-24 md:pb-0" dir="rtl">
```

**Step 2: Add the sticky mobile action bar**

Find the end of the component (currently lines 681-688):
```jsx
              <p className="mt-1 text-[11px] text-gray-400">يُستخدم لتحديد شهر الإجاز وترتيب عرضه على الموقع — يرجى اختياره بدقة.</p>
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}
```
Replace with:
```jsx
              <p className="mt-1 text-[11px] text-gray-400">يُستخدم لتحديد شهر الإجاز وترتيب عرضه على الموقع — يرجى اختياره بدقة.</p>
            </Field>
          </div>
        </div>
      </div>

      {/* Mobile sticky publish bar — same handlers as the sidebar's "النشر" card above */}
      <div className="fixed bottom-0 inset-x-0 z-30 flex gap-2 border-t border-gray-200 bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:hidden">
        {canPublish ? (
          <>
            <button
              type="button"
              onClick={() => handleSave("DRAFT")}
              disabled={saving}
              className="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-700 transition disabled:opacity-50"
            >
              {saving ? "جاري الحفظ..." : "💾 حفظ كمسودة"}
            </button>
            <button
              type="button"
              onClick={() => handleSave("PUBLISHED")}
              disabled={saving}
              className="flex-1 rounded-lg py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
              style={{ background: "#003D33" }}
            >
              🚀 {saving ? "جاري الحفظ..." : form.status === "PUBLISHED" ? "حفظ التغييرات" : "نشر فوراً"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handleSave("DRAFT")}
              disabled={saving}
              className="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-700 transition disabled:opacity-50"
            >
              {saving ? "جاري الحفظ..." : "💾 حفظ كمسودة"}
            </button>
            <button
              type="button"
              onClick={() => handleSave("PENDING_REVIEW")}
              disabled={saving}
              className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
            >
              📤 {saving ? "جاري الإرسال..." : "إرسال للمراجعة"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Verify**

Run: `npx next build`
Expected: `✓ Compiled successfully`.

---

### Task 3: Always-visible gallery controls — PostForm.jsx

**Files:**
- Modify: `src/components/admin/PostForm.jsx` (gallery grid, currently lines 866-914)

**Step 1: Replace the hover-gated overlay with always-visible controls**

Find:
```jsx
            {/* Grid of uploaded images */}
            {form.gallery.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {form.gallery.map((src, i) => (
                  <div key={i} className="group relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => (e.target.style.opacity = "0.3")}
                    />
                    {/* Overlay actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                      {/* Move right */}
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => moveGalleryImage(i, i - 1)}
                          className="text-white text-xs bg-white/20 hover:bg-white/40 rounded px-2 py-0.5"
                        >
                          ← تقديم
                        </button>
                      )}
                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(i)}
                        className="text-white text-xs bg-red-500/80 hover:bg-red-600 rounded px-2 py-0.5"
                      >
                        حذف
                      </button>
                      {/* Move left */}
                      {i < form.gallery.length - 1 && (
                        <button
                          type="button"
                          onClick={() => moveGalleryImage(i, i + 1)}
                          className="text-white text-xs bg-white/20 hover:bg-white/40 rounded px-2 py-0.5"
                        >
                          تأخير →
                        </button>
                      )}
                    </div>
                    {/* Index badge */}
                    <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] font-bold rounded px-1">
                      {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
```
Replace with:
```jsx
            {/* Grid of uploaded images */}
            {form.gallery.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {form.gallery.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => (e.target.style.opacity = "0.3")}
                    />
                    {/* Remove — always visible (a hover-only control is unreachable on touch) */}
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(i)}
                      className="absolute top-1 left-1 w-5 h-5 rounded-full bg-red-500/90 text-white text-xs font-bold flex items-center justify-center"
                    >
                      ✕
                    </button>
                    {/* Reorder strip — always visible */}
                    {form.gallery.length > 1 && (
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/50 px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() => moveGalleryImage(i, i - 1)}
                          disabled={i === 0}
                          className="text-white text-[10px] bg-white/20 hover:bg-white/40 disabled:opacity-30 rounded px-1.5 py-0.5"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => moveGalleryImage(i, i + 1)}
                          disabled={i === form.gallery.length - 1}
                          className="text-white text-[10px] bg-white/20 hover:bg-white/40 disabled:opacity-30 rounded px-1.5 py-0.5"
                        >
                          →
                        </button>
                      </div>
                    )}
                    {/* Index badge */}
                    <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] font-bold rounded px-1">
                      {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
```

Note the index badge stays `top-1 right-1` and the new remove button uses `top-1 left-1` so they don't overlap.

**Step 2: Verify**

Run: `npx next build`
Expected: `✓ Compiled successfully`.

---

### Task 4: Always-visible gallery controls — AchievementForm.jsx

**Files:**
- Modify: `src/components/admin/AchievementForm.jsx` (`ThumbnailStrip` component, currently lines 124-183)

**Step 1: Remove the hover gate from the remove button**

Find (currently line 171):
```jsx
            className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-bl-lg text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
```
Replace with:
```jsx
            className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-bl-lg text-[10px] font-bold flex items-center justify-center"
```

**Step 2: Remove the hover gate from the drag-handle indicator**

Find (currently line 176):
```jsx
          <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-black/40 to-transparent flex items-end justify-center pb-0.5 opacity-0 group-hover:opacity-100 transition">
```
Replace with:
```jsx
          <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-black/40 to-transparent flex items-end justify-center pb-0.5">
```

Note: reordering here is still drag-and-drop only (`draggable`), which has no native touch support — that's unchanged and out of scope for this plan (the design doc only commits to fixing *visibility*, not adding a touch drag-and-drop implementation). The fix above makes removal usable on touch; reordering on a phone still requires opening the item on desktop, same as before this plan.

**Step 3: Verify**

Run: `npx next build`
Expected: `✓ Compiled successfully`.

---

### Task 5: Card layout for the posts/achievements list — PostsTable.jsx

**Files:**
- Modify: `src/components/admin/PostsTable.jsx`

**Step 1: Extract the empty-state message into a shared variable**

Find (currently line 163):
```jsx
  const totalPages = Math.ceil(total / perPage);

  return (
```
Replace with:
```jsx
  const totalPages = Math.ceil(total / perPage);

  const emptyMessage = `لا توجد ${
    itemLabelAr === "مقال" ? "مقالات" : itemLabelAr === "خبر" ? "أخبار" : itemLabelAr + "ات"
  } تطابق الفلاتر المحددة`;

  return (
```

**Step 2: Use the shared variable in the table's empty row and wrap the table for `md+` only**

Find (currently lines 317-361):
```jsx
      {/* ── Table ──────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-right">
            <tr>
              <th className="px-4 py-3 w-10">
                <input type="checkbox"
                  checked={selected.size === posts.length && posts.length > 0}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-[#003D33] focus:ring-[#A48E68]"
                />
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">العنوان</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-20 hidden md:table-cell">النوع</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-24 hidden sm:table-cell">الكاتب</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-20">الحالة</th>
              <th
                className="px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-[#003D33] w-28 select-none hidden lg:table-cell"
                onClick={() => toggleSort("date")}
              >
                التاريخ <SortIcon active={currentSort === "date"} dir={currentDir} />
              </th>
              <th
                className="px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-[#003D33] w-24 select-none whitespace-nowrap hidden md:table-cell"
                onClick={() => toggleSort("views")}
              >
                مشاهدات <SortIcon active={currentSort === "views"} dir={currentDir} />
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-28">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {posts.length === 0 && (
              <tr>
                <td colSpan={8} className="py-16 text-center text-gray-400">
                  {`لا توجد ${
                    itemLabelAr === "مقال"
                      ? "مقالات"
                      : itemLabelAr === "خبر"
                      ? "أخبار"
                      : itemLabelAr + "ات"
                  } تطابق الفلاتر المحددة`}
                </td>
              </tr>
            )}
```
Replace with:
```jsx
      {/* ── Table (md and up) ─────────────────────── */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-right">
            <tr>
              <th className="px-4 py-3 w-10">
                <input type="checkbox"
                  checked={selected.size === posts.length && posts.length > 0}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-[#003D33] focus:ring-[#A48E68]"
                />
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">العنوان</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-20 hidden md:table-cell">النوع</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-24 hidden sm:table-cell">الكاتب</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-20">الحالة</th>
              <th
                className="px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-[#003D33] w-28 select-none hidden lg:table-cell"
                onClick={() => toggleSort("date")}
              >
                التاريخ <SortIcon active={currentSort === "date"} dir={currentDir} />
              </th>
              <th
                className="px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-[#003D33] w-24 select-none whitespace-nowrap hidden md:table-cell"
                onClick={() => toggleSort("views")}
              >
                مشاهدات <SortIcon active={currentSort === "views"} dir={currentDir} />
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-28">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {posts.length === 0 && (
              <tr>
                <td colSpan={8} className="py-16 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            )}
```

**Step 3: Add the mobile card list right after the table**

Find (currently lines 436-441):
```jsx
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────── */}
```
Replace with:
```jsx
          </tbody>
        </table>
      </div>

      {/* ── Cards (below md) ───────────────────────── */}
      <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
        {posts.length === 0 && (
          <p className="py-16 text-center text-sm text-gray-400">{emptyMessage}</p>
        )}
        {posts.map((post) => (
          <div
            key={post.id}
            className={`rounded-xl border p-3 ${selected.has(post.id) ? "border-[#003D33]/30 bg-[#003D33]/3" : "border-gray-200"}`}
          >
            <div className="flex items-start gap-2">
              <input type="checkbox"
                checked={selected.has(post.id)}
                onChange={() => toggleOne(post.id)}
                className="mt-1 rounded border-gray-300 text-[#003D33] focus:ring-[#A48E68]"
              />
              <div className="min-w-0 flex-1">
                {(can(userRole, "EDIT_ANY_POST") || !userId || post.authorId === userId) ? (
                  <Link href={`/admin/posts/${post.id}${post.type === "ACHIEVEMENT" ? "?type=ACHIEVEMENT" : ""}`}
                    className="block font-medium text-gray-800 hover:text-[#003D33] line-clamp-2">
                    {post.titleAr}
                  </Link>
                ) : (
                  <span className="block font-medium text-gray-800 line-clamp-2">{post.titleAr}</span>
                )}
                {post.category && (
                  <span className="text-xs text-gray-400">{post.category.nameAr}</span>
                )}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[post.status]}`}>
                {STATUS_LABEL[post.status]}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[post.type]}`}>
                {TYPE_LABEL[post.type]}
              </span>
              {post.author?.nameAr && (
                <span className="text-xs text-gray-400">{post.author.nameAr}</span>
              )}
              <span className="ms-auto text-xs text-gray-400">
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString("en-GB")
                  : new Date(post.createdAt).toLocaleDateString("en-GB")}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-1 border-t border-gray-100 pt-2">
              {(can(userRole, "EDIT_ANY_POST") || !userId || post.authorId === userId) && (
                <Link href={`/admin/posts/${post.id}${post.type === "ACHIEVEMENT" ? "?type=ACHIEVEMENT" : ""}`}
                  className="rounded px-2 py-1 text-xs font-medium text-[#003D33] hover:bg-[#003D33]/5">
                  تعديل
                </Link>
              )}
              {post.status === "PUBLISHED" && (
                <Link href={`/ar/news/${post.slug}`} target="_blank"
                  className="rounded px-2 py-1 text-xs text-blue-500 hover:bg-blue-50">
                  معاينة
                </Link>
              )}
              {(can(userRole, "DELETE_ANY_POST") || (can(userRole, "DELETE_OWN_POST") && (!userId || post.authorId === userId))) && (
                <button onClick={() => deletePost(post.id)} disabled={deleting === post.id}
                  className="ms-auto rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50 disabled:opacity-50">
                  {deleting === post.id ? "…" : "حذف"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Pagination ─────────────────────────────── */}
```

**Step 4: Verify**

Run: `npx next build`
Expected: `✓ Compiled successfully`.

---

### Task 6: End-to-end manual verification

No code changes — confirms Tasks 1-5 together. Use the Claude Preview MCP tool (`preview_start`, `preview_eval`, `preview_resize`, `preview_screenshot`).

**Step 1: Start the preview server and resize to mobile**

Use `preview_resize` with a 375x812 (or similar) viewport.

**Step 2: Posts list** — navigate to `/admin/posts` logged in as the seeded `SUPER_ADMIN` account (`admin@moc.gov.sy`). This component isn't gated by role-specific layout, so verifying as admin is equivalent to verifying as `MEDIA_OFFICE` for the responsive behavior itself.
- Confirm the table is gone and a stacked card list is shown instead, with no horizontal scrolling.
- Confirm each card shows title, status/type badges, and action buttons, and that تعديل/معاينة/حذف are tappable.

**Step 3: Achievements list** — repeat Step 2 at `/admin/achievements`.

**Step 4: Post editor** — open `/admin/posts/new`.
- Confirm a sticky bar with "حفظ كمسودة" / "نشر فوراً" is pinned to the bottom of the viewport at all scroll positions.
- Scroll to the gallery section (upload at least one image first if testing fresh), confirm the "✕" remove button and "←"/"→" reorder buttons are visible without needing to hover/long-press.
- Confirm the last field in the form isn't visually covered by the sticky bar.

**Step 5: Achievement editor** — open `/admin/posts/new?type=ACHIEVEMENT`, repeat the sticky-bar check from Step 4, and confirm the gallery thumbnail "✕" remove button is visible without hovering.

**Step 6: Desktop regression check** — resize back to a desktop width (e.g. 1280px) and confirm: the posts/achievements pages show the original table (not cards), and the post/achievement editors show the original sidebar layout with no sticky bottom bar duplicate.

**No commit step** — this project is not a git repository.
