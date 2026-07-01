# Media Office Mobile Dashboard — Design

**Goal:** Make the four admin pages actually used by the `MEDIA_OFFICE` role — dashboard, news (`/admin/posts`), achievements (`/admin/achievements`), and categories — fully usable on a phone (375px). The post/achievement editor and the posts/achievements list table are shared by every content role (Admin, Editor, Author, Contributor, Media Office), so the fixes below benefit all of them, not just Media Office.

**Scope correction from initial ask:** `MEDIA_OFFICE` is explicitly blocked from `/admin/media` (redirect in [media/page.js](../../src/app/admin/media/page.js)'s `if (user.role === ROLES.MEDIA_OFFICE) redirect("/admin/dashboard")`, and the sidebar link is hidden for it). Its real fourth page is `/admin/categories`. Inline image upload inside the post/achievement editor stays — that's covered by fix #2 below.

## Audit findings (code-level, no live test account used)

1. **Dashboard** (`/admin/dashboard`) — already responsive (stats grid collapses to 1 column, sidebar becomes a drawer below `md`). No changes needed.
2. **Post/Achievement editor** ([PostForm.jsx](../../src/components/admin/PostForm.jsx), [AchievementForm.jsx](../../src/components/admin/AchievementForm.jsx)):
   - Critical: Save/Publish/Draft buttons live in a sidebar column (`lg:col-span-1`) that stacks *below* the entire article body on mobile (`grid-cols-1`) — a writer must scroll past the title, editor, and SEO fields to find the publish button.
   - Critical: Gallery image delete/reorder controls are gated by `opacity-0 group-hover:opacity-100` — unreachable on touch devices, which have no hover state.
3. **Posts/Achievements list** ([PostsTable.jsx](../../src/components/admin/PostsTable.jsx), shared by both pages): has `overflow-x-auto` + progressive `hidden sm/md/lg:table-cell` column hiding already, but remains a horizontally-scrollable table on phones rather than a true mobile layout.
4. **Categories** ([CategoriesManager.jsx](../../src/components/admin/CategoriesManager.jsx)) — simple 2-column grid that already stacks fine on mobile. No changes needed.

## Approach

Targeted, presentation-only fixes confined to the three files above. No new routes, no new state, no API changes — every fix reuses existing handlers and data, just adds a second Tailwind-gated render path (`hidden md:block` / `md:hidden`), consistent with how the rest of the codebase already switches layouts at `md` (e.g. `AdminShell`'s sidebar drawer).

### 1. Sticky mobile action bar (PostForm.jsx, AchievementForm.jsx)

Below `md`, render the Save/Publish/Draft buttons (same `handleSave(...)` calls, same `canPublish`/`saving` conditions already in the sidebar "النشر" card) in a `fixed bottom-0 inset-x-0 md:hidden` bar with a top border/shadow, so they're always one tap away regardless of scroll position. The existing sidebar card keeps rendering unchanged at `md+` (and stays visible on mobile too, for the status `<select>`); only the action buttons are duplicated into the fixed bar — same JSX/handlers, not new logic. Add bottom padding (`pb-20 md:pb-0`) to the page's scrollable content wrapper so the fixed bar never overlaps the last field.

### 2. Always-visible gallery controls (PostForm.jsx, AchievementForm.jsx)

Replace `opacity-0 group-hover:opacity-100` with permanently visible controls: a small semi-transparent "×" delete badge in the corner of each thumbnail, and slim always-visible move-left/right icon buttons in a thin strip under the thumbnail. Works identically for mouse and touch — removes the need for a hover-based interaction mode entirely. Same `removeGalleryImage`/`moveGalleryImage` handlers, CSS-only change.

### 3. Card layout for the posts/achievements list (PostsTable.jsx)

Below `md`, render a stacked list of cards instead of `<table>` — each card shows: checkbox, title (`line-clamp-2`) + category, status/type badges, author + date if present, and the same action buttons (تعديل / معاينة / حذف) as a row at the bottom. The existing `<table>` keeps rendering unchanged at `md+` (wrapped in `hidden md:block`). Filter bar, bulk-action bar, and pagination are untouched — they already wrap reasonably on narrow screens. Same `posts` prop, same `selected`/`toggleOne`/`deletePost`/`STATUS_BADGE` etc. — purely a second render path for the same data.

## Edge cases

- Long titles in cards: `line-clamp-2` to prevent overflow (table already uses `line-clamp-1`).
- Empty state ("لا توجد أخبار...") renders once, independent of breakpoint.
- Sticky bottom bar uses a z-index below the mobile sidebar drawer/overlay (`z-30` vs. the drawer's `z-40`/`z-50`) so opening the hamburger menu still covers it correctly.
- On-screen keyboard covering the sticky bar while a field near the bottom has focus is an accepted trade-off — not fixable without JS viewport hacks, out of scope.

## Testing

No automated test framework in this project (confirmed in the prior copyright-form plan). Verification is `npx next build` plus a manual check via the Claude Preview MCP tool at a 375px viewport on `/admin/posts`, `/admin/achievements`, and the post/achievement create-or-edit form. Since all three touched components are shared by every content role (not gated by `MEDIA_OFFICE`-specific UI), verification can use the existing seeded `SUPER_ADMIN` account — no dedicated Media Office test account is needed; the layout itself doesn't vary by role, only which action buttons are visible (pre-existing, untouched logic).

**No commit step** — this project is not a git repository.
