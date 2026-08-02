# Number Circle Alignment Design

## Goal

Center every numeric label inside a circular UI element while preserving the latest copyright portal update.

## Design

Use one explicit global utility class, `number-circle`, only on circular elements whose visible content is a number. The utility will isolate numeric direction, use a stable numeric font stack, normalize the line box, and apply a one-pixel optical baseline correction. Icons, decorative dots, status pills, and non-circular number labels remain unchanged.

The class will be added to numbered circles in the public service flows, news pagination, calendar counters and date cells, plus numeric admin notification/progress circles. A source-level regression test will scan the affected JSX files and fail whenever a known circular numeric element does not use the utility.

## Copyright portal version

The current `src/app/[locale]/services/copyright/page.js` is byte-for-byte identical to the version packaged in `moc-update.zip`. It already uses the title `بوابة حماية حقوق المؤلف`, the shared `SubpageHero`, and does not render the removed date in the hero. The alignment change must be layered on top of this file without reverting its other edits.

