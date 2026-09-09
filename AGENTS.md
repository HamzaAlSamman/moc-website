<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Plesk deployment package

**The build runs on the dev machine, not the server.** `next build` on the
production server takes minutes because RAM is tight; locally it finishes in
~20–50 seconds. So deploys ship the compiled `.next` output instead of `src`,
and the server never runs `next build`. It still runs `npm install`, because
the Prisma query engine and any native binaries must be built for the server's
own OS — those cannot be shipped from Windows.

When the user asks to "save/upload/deploy to Plesk", run `.\deploy.ps1`
(or `.\deploy.ps1 -PackageOnly` to build the ZIP without uploading; it then
prints the server commands, since SSH from outside is often blocked and the
upload happens through Plesk File Manager).

- Include: `.next` (build output), `public` except uploads, `prisma`, `scripts`, `design-system`, `package.json`, `package-lock.json`, `next.config.mjs`, `postcss.config.mjs`, `jsconfig.json`, `README.md`, `AGENTS.md`, and a generated `restore-next-aliases.sh`.
- Exclude: `src` (the server never reads source now), `public/uploads`, `public/uploads.zip`, `node_modules`, `.next/cache`, `.next/dev`, `.next/node_modules`, `.env*`, `.codegraph`, database dumps, existing ZIP files, and local/temp backup folders.
- The script verifies the ZIP before uploading and aborts if `.next/BUILD_ID` is missing (incomplete build) or if anything forbidden slipped in.

Server commands after uploading `moc-update.zip` to
`/var/www/vhosts/moc.gov.sy/httpdocs/next-app`:

```bash
cd /var/www/vhosts/moc.gov.sy/httpdocs/next-app
pm2 stop moc-next
rm -rf .next src
unzip -o moc-update.zip
rm -f moc-update.zip
npm install
npx prisma migrate deploy
npx prisma generate
sh restore-next-aliases.sh && rm -f restore-next-aliases.sh
pm2 restart moc-next --update-env
```

`prisma migrate deploy` applies any new migration files under `prisma/migrations/`
to the production database. Skipping it after a release that adds new tables
or columns leaves the schema out of sync — the app will throw at runtime the
moment it touches the missing table/column, not at build time.

### Why `.next/dev` and `.next/node_modules` are excluded

Both are traps a naive "just zip `.next`" hits — found the hard way when the
first package came out at **1.2 GB** instead of 51 MB:

- **`.next/dev`** is the dev server's output (`npm run dev`). It survives
  `next build`, runs ~1.5 GB, and `next start` never reads it.
- **`.next/node_modules`** holds *symlinks* Turbopack creates into the real
  `node_modules`. Zipping on Windows **follows** them, absorbing whole packages
  — including Windows-only Prisma engine binaries that cannot run on Linux.

Those symlinks are not decorative: the compiled server chunks call
`require("@prisma/client-<hash>")` with a bare specifier, which Node resolves
by walking up to `.next/node_modules`. Ship the build without them and the app
dies at *runtime* with `MODULE_NOT_FOUND` — nothing fails at build or upload
time. So `deploy.ps1` reads the local symlinks and generates
`restore-next-aliases.sh`, run on the server **after** `npm install` so each
alias points at the server's own `node_modules`. The hashes change every build,
which is why the script is generated rather than written by hand. It re-checks
every link it creates and exits non-zero on a broken one, so a failed
`npm install` stops the deploy *before* `pm2 restart` — the previous release
keeps serving instead of the site going down.

### `NEXT_PUBLIC_*` variables must be set before the local build

Since `next build` runs on the developer's machine, `NEXT_PUBLIC_*` vars are
baked in from **the local build environment**, not from Plesk. Setting one on
Plesk has no effect until the next local build and redeploy — see
[`NEXT_PUBLIC_CHAM_CASH_ACCOUNT_CODE`](#copyright-payment-account-code) below.

### `sitemap.js` and build-time data

`src/app/sitemap.js` queries Prisma with `export const revalidate = 3600`, so
it is pre-rendered once during the local build (against the dev machine's
`DATABASE_URL`) and then revalidated against the *running server's* database
every hour. Nothing breaks — the sitemap self-corrects within an hour of each
deploy — but don't expect it to reflect production posts immediately.

### Verify schema parity, don't assume it

`migrate deploy` reporting "no pending migrations" does **not** mean production
matches `schema.prisma`. Most of this project's schema was originally applied
with `prisma db push` on the dev machine, and
`20260802090000_baseline_pre_citizen_booking` is meant to be marked applied
*without executing* (see `prisma/migrations/BASELINE_RUNBOOK.md`) — so any
table that only ever existed on dev is silently absent in production while the
migration history claims otherwise. This is how the whole legal-licenses
feature shipped without its five tables: every page touching it died with
`P2021 The table public.LegalLicenseApplication does not exist`, and nothing
surfaced it at build or deploy time.

After any release that changes `schema.prisma`, run this on the server — it
compares the live database against the schema and prints the SQL needed to
close the gap (empty output means production is in sync):

```bash
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
```

Review that SQL before applying it. It is a *diff*, so it can contain `DROP`
statements for anything production has that the schema no longer declares —
back up first, and never pipe it straight into the database unread.

### Citizen account email settings

Citizen verification reuses the existing `src/lib/mailer.js` SMTP contract.
Provision these variables on Plesk; do not add parallel mail variables:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@moc.gov.sy
# Set to true only if the ministry relay uses an expired/self-signed certificate.
SMTP_TLS_INSECURE=false
```

If the relay needs that certificate exception and `SMTP_TLS_INSECURE` is absent
or false, Nodemailer rejects the connection and citizen OTP mail is not sent.

### Event ticket signing secret

Every booking stores an HMAC of (referenceNo, eventId, nationalIdHash) in
`EventBooking.ticketSig`, written inside the booking transaction. The ticket
QR code, the printed verification code and the door check-in all derive from
it. `createBookingTicketSignature` **throws** when the secret is missing or
shorter than 32 characters — and because it runs inside the booking
transaction, an unset variable means every booking attempt fails, not just
ticket printing:

```env
BOOKING_TICKET_SECRET=<32+ random characters>
```

Rotating it invalidates every ticket already issued: previously printed QR
codes and verification codes stop matching, while the bookings themselves stay
intact. Re-issue tickets after a rotation.

The same secret also keys the ticket QR itself (next section), so a rotation
invalidates printed QR codes on both counts. No second secret is provisioned
for it — `ticket-scan-payload.mjs` derives its AES key from this one via HKDF.

### The ticket QR is encrypted, and the door screen needs a camera

A ticket QR no longer contains the verification URL. It contains
`MOCT1.<base64url>` — AES-256-GCM ciphertext over (referenceNo, code). A phone
camera pointed at a ticket shows an unactionable string and opens nothing;
only `/admin/scan`, behind a `SCAN_EVENT_TICKETS` session, decodes it, because
only the server holds the key. Check-in has always required that session — the
encryption is the layer that stops a generic reader from even *reading* a
ticket, which is what the ministry asked for.

Two deployment consequences:

- **`Permissions-Policy` must allow the camera on `/admin/scan`.** The
  site-wide header in `next.config.mjs` sends `camera=()`, which blocks
  `getUserMedia` at the browser level — the officer never even sees a
  permission prompt, and no setting on their phone helps. The config carries a
  single exact-path exception for `/admin/scan`. Any reverse proxy or Plesk
  rule that re-adds a blanket `Permissions-Policy` header will silently break
  the scanner while every other page keeps working.
- **The scanner needs HTTPS.** `getUserMedia` is unavailable on plain HTTP
  outside `localhost`, so door staff must reach the panel over
  `https://moc.gov.sy/admin/scan`.

Decoding happens in the browser: `BarcodeDetector` where the platform has it
(Android Chrome — what door phones run), and `jsqr`, imported on demand, where
it does not (notably iOS Safari). Manual entry of the printed reference plus
verification code stays as the fallback for a damaged ticket, and goes through
the same server-side checks.

### Event tickets and PDF generation

Every PDF the site issues — the copyright receipt, the legal-license document
and the event ticket — is rendered by driving a **system-installed Chromium**
through `puppeteer-core`. `puppeteer-core` deliberately ships no browser of its
own, so the server must provide one:

```bash
# AlmaLinux / RHEL (this server)
dnf install -y chromium
# Debian / Ubuntu
apt install -y chromium
```

If Chromium lives somewhere unusual, point at it explicitly instead:

```env
PUPPETEER_EXECUTABLE_PATH=/usr/lib64/chromium-browser/chromium-browser
```

All three generators resolve the browser through
`src/lib/chromium-executable.mjs`. They each used to carry their own copy of
the probe with **different** candidate lists — only the receipt generator knew
the AlmaLinux path `/usr/lib64/chromium-browser/chromium-browser` — so on
production the copyright receipt would render while the ticket and the license
failed at the same moment. Nothing surfaced the difference at build time,
because a Windows dev box finds Chrome via a path all three lists shared. Add
new candidates to that module only; `chromium-executable.test.mjs` fails if a
generator grows a private copy again.

### Undoing a check-in

`DELETE /api/admin/tickets/check-in` (door, ticket in hand) and
`DELETE /api/admin/bookings/[id]/check-in` (desk, booking id) both reverse an
attendance record to `NOT_CHECKED_IN` — never to `NO_SHOW`, which is what
closing the register produces later.

A `TICKET_OFFICER` may only reverse a check-in **it recorded itself**. The rule
is enforced inside `undoCheckIn`'s transaction against the stored
`checkedInById`, not in the route, so nothing can slip between the check and
the write; the door screen surfaces the refusal as `CHECK_IN_NOT_YOURS`. Roles
holding `MANAGE_EVENT_BOOKINGS` are unrestricted on their own events. Both
paths write an `EVENT_BOOKING_CHECK_IN_REVERTED` audit row — but only when
something was actually reversed, so a double tap does not manufacture a second
entry.

A ticket also needs the verification-link origin (`APP_BASE_URL`, see below)
and `BOOKING_TICKET_SECRET`. When issuing fails, the response carries a `code`
distinguishing the cause, and the pm2 log names it:

| `code` | Meaning |
| --- | --- |
| `PDF_ENGINE_UNAVAILABLE` | Chromium is not installed / not found |
| `APP_BASE_URL_MISSING` | no `APP_BASE_URL`/`NEXT_PUBLIC_APP_URL`/`NEXT_PUBLIC_SITE_URL` |
| `PDF_RENDER_FAILED` | rendering itself failed — read the logged stack |

```bash
pm2 logs moc-next --lines 100 --nostream | grep "ticket PDF"
```

### Booking confirmation emails carry the ticket

`BOOKING_CONFIRMED` and `BOOKING_PROMOTED` notifications attach the ticket PDF
and link to the citizen's own ticket page. Nothing else does — a waitlisted or
cancelled booking has no admissible ticket, and attaching one would hand the
citizen a document that gets turned away at the door.

This means **the outbox worker now renders PDFs**, so it launches Chromium once
per confirmation email and takes seconds rather than milliseconds per row. It
is already serialized (`booking-ticket-pdf.js` keeps one Chromium at a time),
so this costs latency, not memory.

Because the ticket now travels with the mail, its byte size is a running cost:
a 500-booking event multiplies it by 500 through the ministry relay. Keep new
imagery out of `booking-ticket-pdf.js` unless it is small — Chromium
rasterizes repeating backgrounds into the output, and tiling the 136 KB
`public/svg/pattern-hex.svg` across the header alone accounted for 569 KB of a
745 KB ticket. Both the ticket and the email shell now draw the identity from
the ~0.6 KB tile in `ministry-hex-tile.mjs`; the ticket is 176 KB.

Rendering is deliberately non-fatal. If Chromium or `APP_BASE_URL` is missing,
throwing would mark the outbox row failed, retry it eight times over a day and
then give up — a server misconfiguration would silently swallow **every**
booking confirmation, not just the attachment. Instead the email goes out with
the account link only, and the reason is logged:

```bash
pm2 logs moc-next --lines 200 --nostream | grep "ticket attachment skipped"
```

Seeing that line means citizens are getting confirmations without the PDF —
fix the Chromium/`APP_BASE_URL` setup above and the next booking mails itself
correctly; already-sent mail is not re-issued.

### Password-reset link base URL

Password-reset links are built server-side from environment configuration only —
never from the request `Host` header, which an attacker could point at their own
domain. Set the canonical origin on Plesk:

```env
APP_BASE_URL=https://moc.gov.sy
```

`NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` are accepted as fallbacks, but
if none of the three is set, `forgotCitizenPassword` throws before sending: the
citizen still sees the generic "link sent" confirmation and no mail ever
arrives. The failure is now logged by `/api/citizen/auth/forgot`, so check the
pm2 log for `Citizen forgot-password error` when reset mail goes missing.

### Copyright payment account code

The Cham Cash wallet/account code shown on the copyright fee-payment card
(`src/app/[locale]/services/copyright/page.js`) is read from
`NEXT_PUBLIC_CHAM_CASH_ACCOUNT_CODE`, with the current production code kept
as a hardcoded fallback so existing deployments keep working. Set this on
Plesk so the code lives in env, not source:

```env
NEXT_PUBLIC_CHAM_CASH_ACCOUNT_CODE=
```

Because it is a `NEXT_PUBLIC_` var it is baked in at build time — and the build
now runs locally, so set it in the local build environment *before* running
`.\deploy.ps1`. A value set only on Plesk has no effect.
