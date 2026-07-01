# Connect Dashboard (CMS) to Website Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all static data files with live data fetched from the Prisma/PostgreSQL CMS database.

**Architecture:** Create public (unauthenticated) API routes under `/api/posts` and `/api/events`. Client components fetch from these routes via `useEffect`. No restructuring of existing components — minimal diff, maximum impact.

**Tech Stack:** Next.js App Router, Prisma ORM, PostgreSQL, React client components

---

## Scope

| Component / Page | Static Source | Target API |
|---|---|---|
| `NewsSection.js` | `src/data/news.js` | `GET /api/posts?type=NEWS&limit=6` |
| `[locale]/news/page.js` | `src/data/news.js` | `GET /api/posts?type=NEWS` |
| `NewsCard.js` | links to `/[locale]/news` | links to `/[locale]/news/[slug]` |
| `[locale]/news/[slug]/page.js` | *doesn't exist* | `GET /api/posts/[slug]` |
| `CulturalCalendarSection.jsx` | hardcoded `EVENTS` const | `GET /api/events` |
| `MonthlyAchievementsSection.jsx` | hardcoded `achievementsData` const | `GET /api/posts?type=ACHIEVEMENT` |
| `[locale]/achievements/page.js` | hardcoded monthly data | `GET /api/posts?type=ACHIEVEMENT` |

---

### Task 1: Public Posts API Route

**Files:**
- Create: `src/app/api/posts/route.js`

**Step 1: Create the file**

```js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type   = searchParams.get("type")  || "NEWS";
  const limit  = parseInt(searchParams.get("limit") || "100", 10);
  const status = searchParams.get("status") || "PUBLISHED";

  const posts = await prisma.post.findMany({
    where:   { type, status },
    orderBy: { publishedAt: "desc" },
    take:    limit,
    select: {
      id: true, slug: true, titleAr: true, titleEn: true,
      summaryAr: true, summaryEn: true, featuredImage: true,
      publishedAt: true, views: true,
      category: { select: { nameAr: true, nameEn: true } },
    },
  });

  return NextResponse.json(posts);
}
```

**Step 2: Test manually**

Start the dev server and open `http://localhost:3000/api/posts?type=NEWS`.
Expected: JSON array (empty if no seeded data, no 500 errors).

**Step 3: Commit**

```bash
git add src/app/api/posts/route.js
git commit -m "feat: add public posts API route"
```

---

### Task 2: Public Single-Post API Route

**Files:**
- Create: `src/app/api/posts/[slug]/route.js`

**Step 1: Create the file**

```js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request, { params }) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where:  { slug, status: "PUBLISHED" },
    select: {
      id: true, slug: true, titleAr: true, titleEn: true,
      summaryAr: true, summaryEn: true,
      contentAr: true, contentEn: true,
      featuredImage: true, publishedAt: true, views: true,
      author:   { select: { nameAr: true, nameEn: true } },
      category: { select: { nameAr: true, nameEn: true } },
    },
  });

  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(post);
}
```

**Step 2: Commit**

```bash
git add src/app/api/posts/[slug]/route.js
git commit -m "feat: add public single-post API route"
```

---

### Task 3: Public Events API Route

**Files:**
- Create: `src/app/api/events/route.js`

**Step 1: Create the file**

```js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const events = await prisma.event.findMany({
    where:   { status: { in: ["UPCOMING", "ONGOING"] } },
    orderBy: { startDate: "asc" },
    select: {
      id: true, titleAr: true, titleEn: true,
      descriptionAr: true, descriptionEn: true,
      location: true, locationEn: true,
      startDate: true, endDate: true,
      featuredImage: true, status: true,
    },
  });

  return NextResponse.json(events);
}
```

**Step 2: Commit**

```bash
git add src/app/api/events/route.js
git commit -m "feat: add public events API route"
```

---

### Task 4: Update NewsSection Component

**Files:**
- Modify: `src/components/NewsSection.js`

**Step 1: Replace static import with API fetch**

Remove: `import { newsData } from "../data/news";`

Add a `useState` + `useEffect` to fetch from the API:

```js
const [newsData, setNewsData] = useState([]);

useEffect(() => {
  fetch("/api/posts?type=NEWS&limit=6")
    .then((r) => r.json())
    .then((data) => Array.isArray(data) && setNewsData(data))
    .catch(() => {});
}, []);
```

Change `newsData.slice(0, 6)` → just `newsData` (API already limits to 6).

**Step 2: Adapt NewsCard article shape**

The API returns `featuredImage` (not `image`). Either:
- Add `image: article.featuredImage` adapter line before the map, OR
- Update `NewsCard` to accept both (see Task 6).

Use adapter for now (minimal change):

```js
const latestNews = newsData.map((a) => ({ ...a, image: a.featuredImage || "/images/placeholder.jpg" }));
```

**Step 3: Commit**

```bash
git add src/components/NewsSection.js
git commit -m "feat: NewsSection fetches live posts from API"
```

---

### Task 5: Update News Listing Page

**Files:**
- Modify: `src/app/[locale]/news/page.js`

**Step 1: Replace static import with API fetch**

Remove: `import { newsData } from "../../../data/news";`

Add state + fetch (the page already uses `useState` for search):

```js
const [allNews, setAllNews] = useState([]);

useEffect(() => {
  fetch("/api/posts?type=NEWS")
    .then((r) => r.json())
    .then((data) => Array.isArray(data) && setAllNews(data))
    .catch(() => {});
}, []);
```

Update filter to use `allNews` and map `featuredImage → image`:

```js
const newsData = allNews.map((a) => ({ ...a, image: a.featuredImage || "/images/placeholder.jpg" }));

const filteredNews = newsData.filter((article) => {
  const title   = isRtl ? article.titleAr : article.titleEn;
  const summary = isRtl ? article.summaryAr : article.summaryEn;
  return (
    title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );
});
```

**Step 2: Commit**

```bash
git add "src/app/[locale]/news/page.js"
git commit -m "feat: news listing page fetches live posts from API"
```

---

### Task 6: Update NewsCard to Link to Detail Page

**Files:**
- Modify: `src/components/NewsCard.js`

**Step 1: Change the href**

Current: `href={\`/${locale}/news\`}`
New:     `href={\`/${locale}/news/${article.slug || article.id}\`}`

Also update the `src` on Image to fall back gracefully:
`src={article.image || article.featuredImage || "/images/placeholder.jpg"}`

**Step 2: Commit**

```bash
git add src/components/NewsCard.js
git commit -m "feat: NewsCard links to individual post detail page"
```

---

### Task 7: Create News Detail Page

**Files:**
- Create: `src/app/[locale]/news/[slug]/page.js`

**Step 1: Create the file**

```jsx
"use client";

import React, { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { translations } from "../../../../data/translations";

export default function NewsDetailPage(props) {
  const params  = use(props.params);
  const locale  = params.locale || "ar";
  const { slug } = params;
  const isRtl   = locale === "ar";
  const t       = translations[locale]?.common || translations.ar.common;

  const [post,    setPost]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/posts/${slug}`)
      .then((r) => r.json())
      .then((data) => { setPost(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF9F6] pt-28">
        <div className="w-8 h-8 border-2 border-[#A48E68] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post || post.error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBF9F6] pt-28 gap-4">
        <p className="text-[#002723] font-bold text-xl">
          {isRtl ? "المقال غير موجود" : "Article not found"}
        </p>
        <Link href={`/${locale}/news`} className="text-[#A48E68] underline text-sm">
          {isRtl ? "العودة للأخبار" : "Back to News"}
        </Link>
      </div>
    );
  }

  const title   = isRtl ? post.titleAr   : (post.titleEn   || post.titleAr);
  const content = isRtl ? post.contentAr : (post.contentEn || post.contentAr);
  const author  = isRtl ? post.author?.nameAr : (post.author?.nameEn || post.author?.nameAr);

  return (
    <div className="min-h-screen bg-[#FBF9F6] pt-28" dir={isRtl ? "rtl" : "ltr"}>
      {/* Hero Image */}
      {post.featuredImage && (
        <div className="relative w-full h-72 sm:h-96">
          <Image src={post.featuredImage} alt={title} fill className="object-cover brightness-75" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#002723]/80 to-transparent" />
        </div>
      )}

      {/* Article Body */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* Back link */}
        <Link href={`/${locale}/news`} className="text-[#A48E68] text-sm hover:underline mb-6 inline-block">
          ← {isRtl ? "العودة للأخبار" : "Back to News"}
        </Link>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002723] mb-4 leading-snug">
          {title}
        </h1>

        <div className="flex items-center gap-3 text-xs text-slate-500 mb-8">
          {post.publishedAt && (
            <span>{new Date(post.publishedAt).toLocaleDateString(isRtl ? "ar-SY" : "en-US")}</span>
          )}
          {author && <span>· {author}</span>}
        </div>

        <div
          className="prose prose-slate max-w-none text-base leading-relaxed text-[#1a1a1a]"
          dangerouslySetInnerHTML={{ __html: content || "" }}
        />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add "src/app/[locale]/news/[slug]/page.js"
git commit -m "feat: add news detail page"
```

---

### Task 8: Update CulturalCalendarSection

**Files:**
- Modify: `src/components/CulturalCalendarSection.jsx`

**Step 1: Add "ثقافي" default type to TYPE map**

In the `TYPE` constant, add:
```js
"ثقافي": { labelAr: "ثقافي", labelEn: "Cultural", color: "#1C665A", light: "bg-[#1C665A]/10 text-[#1C665A] border-[#1C665A]/20" },
```

**Step 2: Add `eventsFromDB` state and fetch**

After the `TYPE` constant and before the component function, remove the `EVENTS` hardcoded const (or keep it as fallback).

Inside the component, add:

```js
const [EVENTS, setEVENTS] = useState({});

useEffect(() => {
  fetch("/api/events")
    .then((r) => r.json())
    .then((events) => {
      if (!Array.isArray(events)) return;
      const grouped = {};
      events.forEach((ev) => {
        const d    = new Date(ev.startDate);
        const key  = `${d.getFullYear()}-${d.getMonth() + 1}`;
        const day  = d.getDate();
        const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        if (!grouped[key])       grouped[key]      = {};
        if (!grouped[key][day])  grouped[key][day] = [];
        grouped[key][day].push({
          titleAr:    ev.titleAr,
          titleEn:    ev.titleEn || ev.titleAr,
          timeAr:     timeStr,
          timeEn:     timeStr,
          locationAr: ev.location  || "",
          locationEn: ev.locationEn || ev.location || "",
          descAr:     ev.descriptionAr || "",
          descEn:     ev.descriptionEn || "",
          type:       "ثقافي",
          admissionAr: "",
          admissionEn: "",
        });
      });
      setEVENTS(grouped);
    })
    .catch(() => {});
}, []);
```

**IMPORTANT:** The existing `EVENTS` constant must be removed (or renamed to `STATIC_EVENTS`) since we now shadow it with the state variable. Remove or rename the large hardcoded `const EVENTS = { ... }` block.

**Step 3: Commit**

```bash
git add src/components/CulturalCalendarSection.jsx
git commit -m "feat: CulturalCalendarSection fetches live events from API"
```

---

### Task 9: Update MonthlyAchievementsSection

**Files:**
- Modify: `src/components/MonthlyAchievementsSection.jsx`

**Step 1: Add fetch state**

Remove the hardcoded `const achievementsData = { ... }` block and the `const months = [...]` block.

Replace with dynamic state:

```js
const [achievementsData, setAchievementsData] = useState({});
const [months, setMonths] = useState([]);

useEffect(() => {
  fetch("/api/posts?type=ACHIEVEMENT")
    .then((r) => r.json())
    .then((posts) => {
      if (!Array.isArray(posts)) return;

      const monthNames = [
        { ar: "يناير", en: "January"   },
        { ar: "فبراير", en: "February"  },
        { ar: "مارس",   en: "March"     },
        { ar: "أبريل",  en: "April"     },
        { ar: "مايو",   en: "May"       },
        { ar: "يونيو",  en: "June"      },
        { ar: "يوليو",  en: "July"      },
        { ar: "أغسطس",  en: "August"    },
        { ar: "سبتمبر", en: "September" },
        { ar: "أكتوبر", en: "October"   },
        { ar: "نوفمبر", en: "November"  },
        { ar: "ديسمبر", en: "December"  },
      ];

      const grouped = {};
      posts.forEach((post) => {
        const d     = new Date(post.publishedAt || post.createdAt);
        const month = d.getMonth() + 1; // 1-12
        if (!grouped[month]) grouped[month] = [];
        grouped[month].push({
          image:   post.featuredImage || "/images/cultural-principle1.jpg",
          title:   post.titleAr,
          titleEn: post.titleEn || post.titleAr,
          desc:    post.summaryAr || "",
          descEn:  post.summaryEn || "",
          tag:     post.category?.nameAr || "ثقافي",
          tagEn:   post.category?.nameEn || "Cultural",
        });
      });

      setAchievementsData(grouped);

      const usedMonths = [...new Set(
        posts.map((p) => new Date(p.publishedAt || p.createdAt).getMonth())
      )].sort((a, b) => a - b);

      setMonths(usedMonths.map((m, i) => ({
        id:     m + 1,
        name:   monthNames[m].ar,
        nameEn: monthNames[m].en,
        year:   String(new Date(posts[0]?.publishedAt || Date.now()).getFullYear()),
      })));
    })
    .catch(() => {});
}, []);
```

**Step 2: Commit**

```bash
git add src/components/MonthlyAchievementsSection.jsx
git commit -m "feat: MonthlyAchievementsSection fetches live achievements from API"
```

---

### Task 10: Update Achievements Page

**Files:**
- Modify: `src/app/[locale]/achievements/page.js`

**Step 1: Replace hardcoded monthly data with API fetch**

The page currently has a large hardcoded `months` array with embedded achievements. Replace with:

```js
const [months, setMonths]     = useState([]);
const [allPosts, setAllPosts] = useState([]);

useEffect(() => {
  fetch("/api/posts?type=ACHIEVEMENT")
    .then((r) => r.json())
    .then((data) => {
      if (!Array.isArray(data)) return;
      setAllPosts(data);

      const monthNames = [
        "يناير","فبراير","مارس","أبريل","مايو","يونيو",
        "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"
      ];

      const grouped = {};
      data.forEach((post) => {
        const d = new Date(post.publishedAt || post.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!grouped[key]) grouped[key] = { monthIdx: d.getMonth(), year: d.getFullYear(), items: [] };
        grouped[key].items.push(post);
      });

      const built = Object.values(grouped)
        .sort((a, b) => a.year !== b.year ? a.year - b.year : a.monthIdx - b.monthIdx)
        .map((g, i) => ({
          id:     i + 1,
          name:   monthNames[g.monthIdx],
          year:   String(g.year),
          achievements: g.items.map((p) => ({
            title:  p.titleAr,
            titleEn: p.titleEn || p.titleAr,
            desc:   p.summaryAr || "",
            descEn: p.summaryEn || "",
            tag:    p.category?.nameAr || "ثقافي",
            tagEn:  p.category?.nameEn || "Cultural",
            image:  p.featuredImage || null,
          })),
        }));

      setMonths(built);
    })
    .catch(() => {});
}, []);
```

Remove the large hardcoded `const months = [...]` at the top of the file.

**Step 2: Commit**

```bash
git add "src/app/[locale]/achievements/page.js"
git commit -m "feat: achievements page fetches live data from API"
```

---

## Testing Checklist

After all tasks:
- [ ] `GET /api/posts?type=NEWS` returns 200 with array
- [ ] `GET /api/posts?type=NEWS&limit=6` returns ≤6 items
- [ ] `GET /api/posts/[slug]` returns 404 for unknown slug
- [ ] `GET /api/events` returns 200 with array
- [ ] Homepage news section loads (shows empty state gracefully if no DB data)
- [ ] News listing page search works
- [ ] News card links to `/[locale]/news/[slug]`
- [ ] News detail page loads and shows 404 state for missing slug
- [ ] Cultural calendar shows (empty or populated)
- [ ] Achievements page renders (empty or populated)

## Notes

- All public API routes return empty arrays if DB is empty — no crashes.
- Admin API routes (`/api/admin/*`) still require authentication — unchanged.
- `status: "PUBLISHED"` filter means only published content appears on the public site.
- The news detail page renders `contentAr`/`contentEn` as raw HTML via `dangerouslySetInnerHTML`. This is safe since content comes from your own CMS, not user input.
