# Instagram Portrait Event Images

## Goal

Standardize every public and administrative event-image presentation on the Instagram portrait ratio, `4:5`, with `1080 × 1350` as the recommended upload size.

## Decisions

- Every event artwork frame uses a `4:5` aspect ratio.
- New portrait artwork fills the available frame without being distorted.
- Existing landscape artwork remains fully visible. It is placed above a blurred, darkened copy of itself so the frame still feels intentional and no text is cropped.
- Image treatment is implemented once as a reusable event-artwork component to prevent presentation rules from drifting between pages.
- The admin event form previews artwork at `4:5` and tells editors that `1080 × 1350` is the recommended size.

## Public Experience

### Cultural-calendar detail dialog

On desktop, the dialog becomes a two-column composition: the portrait artwork occupies one column and the event details occupy the other. The details column may scroll within the viewport when necessary. Direction-aware ordering follows the current locale.

On small screens, the artwork and details stack vertically. The dialog remains bounded by the viewport and retains the existing close control, status information, and navigation actions.

### Event detail page

The current panoramic hero is replaced by a portrait artwork presentation. The artwork remains prominent without stretching to the full page width. Existing event metadata, description, booking controls, and related-event content keep their current behavior.

### Cards and thumbnails

Related-event cards and cultural-calendar thumbnails adopt the same `4:5` frame. Text, status badges, and interaction behavior remain unchanged.

## Administration

The event form uses a `4:5` preview frame and shows the guidance: `Recommended size: 1080 × 1350 px (4:5)`. Upload formats and the existing media API remain unchanged. The ratio is guidance rather than a hard upload rejection so older media can still be edited and retained.

## Compatibility and Failure Handling

- Missing or failed images continue through the existing image fallback behavior.
- Landscape, square, and portrait source files are accepted.
- `object-fit: contain` preserves the full source artwork; a blurred background layer fills unused frame space.
- No schema, API, or data migration is required.
- Decorative background imagery is hidden from assistive technology; the foreground image keeps the meaningful alt text.

## Verification

- Add focused tests for the shared event-artwork presentation and the required `4:5` usage points where the existing test setup permits.
- Run the relevant component tests and lint checks.
- Build the application to catch Next.js image and layout regressions.
- Visually verify desktop and mobile layouts with portrait, landscape, missing, and broken images in both Arabic and English.

## Out of Scope

- Reprocessing or overwriting existing uploaded files.
- Adding separate desktop and social-media image fields.
- Automatically generating portrait artwork from older landscape images.
