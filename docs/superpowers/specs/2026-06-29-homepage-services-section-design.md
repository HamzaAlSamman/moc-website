# Homepage Services Section Design

## Goal

Add a professional "الخدمات الإلكترونية" section to the Ministry homepage so visitors can quickly access three priority digital services while still having a clear path to the full services page.

## Placement

The section will appear on the homepage after the news section and before the cultural calendar section.

## Content

The section includes a short official introduction and three service cards in this exact order:

1. تقديم شكوى لمديرية الرقابة الداخلية
2. طلب تقديم إقامة فعالية
3. التواصل مع مديرية التعاون الدولي

The first card is visually emphasized in a restrained way because it is the priority service requested by the user.

## Interaction

Each card links directly to its service route:

- `/[locale]/services/internal-oversight`
- `/[locale]/services/submit-event`
- `/[locale]/services/international-cooperation`

The section also includes a "عرض جميع الخدمات" call-to-action linking to `/[locale]/services`.

## Visual Direction

The section should match the existing public homepage style: formal, calm, responsive, and consistent with the ministry palette. Cards should be readable on mobile and desktop, avoid clutter, and use familiar iconography with clear labels.

## Implementation Shape

Create a reusable homepage section component, then render it in `src/app/[locale]/page.js` immediately after `NewsSection`.

Also remove the small gallery/photos overlay icon currently shown on the corner above images in the achievements section. This cleanup should only remove that visual corner icon and should not change the achievements content, image behavior, or links.

## Verification

Verify that the page builds, the services section appears after news, all service links include the current locale, no existing homepage section is removed, and the achievements images no longer show the corner gallery/photos overlay icon.
