# Citizen accounts and event booking — production runbook

This runbook deploys citizen registration, identity review, event booking,
notification outbox processing, and the related database migrations to the
Plesk production server. Run commands from:

```bash
/var/www/vhosts/moc.gov.sy/httpdocs/next-app
```

Do not use `prisma migrate reset` on production.

## 1. Maintenance window and backup

1. Announce a short maintenance window and stop application writes.
2. Record the currently deployed Git revision or retain the current code
   archive for rollback.
3. Create and copy a PostgreSQL custom-format backup off the server:

```bash
pg_dump -U <db-user> -d <production-db> -F c -f "moc_cms_prod_$(date +%Y%m%d%H%M).dump"
```

Do not continue until the backup exists and can be read by `pg_restore -l`.

## 2. Required environment

Provision all values in Plesk/PM2. Every secret below must be independently
generated, at least 32 characters, and must not be reused for another purpose.

```env
SESSION_SECRET=
CITIZEN_ID_PEPPER=
CITIZEN_OTP_SECRET=
BOOKING_TICKET_SECRET=

APP_BASE_URL=https://moc.gov.sy

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@moc.gov.sy
# Set true only when the ministry relay requires accepting its expired or
# self-signed certificate. Keep false for a normally trusted certificate.
SMTP_TLS_INSECURE=false

CITIZEN_EMAIL_OTP_TTL_SECONDS=600
CITIZEN_EMAIL_OTP_RESEND_COOLDOWN_SECONDS=60
CITIZEN_EMAIL_OTP_MAX_ATTEMPTS=5

# Must be outside public/httpdocs and writable only by the application user.
PRIVATE_UPLOAD_DIR=/var/www/vhosts/moc.gov.sy/private/moc-uploads

OUTBOX_CRON_SECRET=
OUTBOX_BATCH_SIZE=50
UNVERIFIED_CITIZEN_TTL_HOURS=24
```

Generate each secret separately, for example:

```bash
openssl rand -base64 48
```

Operational invariants:

- Never change `CITIZEN_ID_PEPPER` after citizens exist; doing so breaks
  national-ID lookup and uniqueness checks.
- Rotating `BOOKING_TICKET_SECRET` invalidates previously issued ticket
  signatures.
- Rotating `SESSION_SECRET` is allowed but signs out all staff and citizens
  once. Plan for that one-time logout during this deployment if the old secret
  is being replaced.
- The server builds password-reset URLs only from `APP_BASE_URL`; do not use a
  request `Host` header or a public client variable as its security source.
- Do not introduce `SMTP_SECURE` or `MINISTRY_MAIL_*`; `src/lib/mailer.js` is
  the single SMTP contract.

Create the private directory before starting the application:

```bash
install -d -m 700 -o <plesk-system-user> -g <plesk-system-group> /var/www/vhosts/moc.gov.sy/private/moc-uploads
```

## 3. Reconcile the migration baseline once

This repository replaces an unreplayable legacy migration history with
`20260802090000_baseline_pre_citizen_booking`. Follow
`prisma/migrations/BASELINE_RUNBOOK.md` exactly before the first deployment.
It covers the production backup, whether to resolve or execute the baseline,
two possible stale migration rows, and four known `updatedAt` defaults.

Stop if production shows any unlisted schema drift. Do not guess and do not
reset the database.

The baseline step is complete only when:

```bash
npx prisma migrate status
```

reports `Database schema is up to date!` before the new feature migration is
deployed.

## 4. Install and deploy migrations

After uploading and extracting `moc-update.zip`:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status
```

Expected new feature migration:

```text
20260802095902_citizen_accounts_and_bookings
```

The final status must be clean. Then build and restart:

```bash
NODE_OPTIONS="--max-old-space-size=1024" npm run build
pm2 restart moc-next --update-env
```

## 5. SMTP acceptance check

Use one controlled ministry mailbox. The check uses the same shared mailer as
OTP and outbox notifications and sends one real message:

```bash
NODE_ENV=production SMTP_TEST_TO=<controlled-test-address> npm run smtp:check
```

Pass criteria:

- command returns `"ok": true`;
- the recipient receives the message;
- `accepted` contains the address and `rejected` is empty.

If the relay uses an expired/self-signed certificate, set
`SMTP_TLS_INSECURE=true` only after verifying the certificate exception with
the infrastructure owner. Otherwise keep it false.

## 6. Plesk scheduled task for the outbox

Create a Plesk scheduled task that runs every minute. Ensure
`OUTBOX_CRON_SECRET` is present in the scheduled-task environment, then use:

```bash
/usr/bin/curl -fsS -X POST -H "Authorization: Bearer $OUTBOX_CRON_SECRET" https://moc.gov.sy/api/internal/process-notification-outbox
```

Pass criteria: HTTP 200 JSON with `"ok": true`. A missing/incorrect secret
must return 401; an unconfigured server returns 503. The worker safely claims
rows with `FOR UPDATE SKIP LOCKED`, retries failures with bounded exponential
backoff, recovers stale locks, and performs the periodic unverified-account
cleanup. Multiple overlapping invocations must not duplicate a delivery.

## 7. Post-deployment smoke test

Use a dedicated test citizen and test event:

1. Register; confirm the email contains a six-digit OTP and no OTP appears in
   application logs or database plaintext.
2. Verify the email and confirm automatic citizen login.
3. Upload front/back identity images; confirm direct public URLs do not work.
4. Review the identity as an authorized admin; confirm the audit entry and
   email notification.
5. Book an open event, confirm a `BKG` reference and ticket, then fill its
   capacity and confirm the next citizen is waitlisted.
6. Cancel a confirmed booking and confirm the oldest waiter is promoted once.
7. Check in a booking and confirm attendance is stored separately from booking
   status.
8. Run the cron endpoint and confirm pending notifications are delivered.
9. Run the report-only invariant check:

```bash
npm run booking:reconcile
```

It must report an empty `drifts` array. Never use the repair command unless a
reviewed incident specifically approves counter repair.

## 8. Rollback

### Application-only rollback

If the schema is healthy but the application fails:

1. `pm2 stop moc-next`.
2. Restore the previous code archive/revision.
3. `npm install`, `npx prisma generate`, and rebuild the previous version.
4. `pm2 restart moc-next --update-env`.

Keep the additive booking tables in place. Do not delete migrations or run a
down migration merely to roll back application code. Pause the outbox cron if
the old application cannot safely coexist with queued notifications.

### Database rollback

If the migration itself caused verified data/schema damage, stop the app and
cron, preserve a second incident snapshot, then restore the pre-deployment
backup to a controlled replacement database with `pg_restore`. Point the app
to the verified restored database only after checking migration status. This
is a destructive emergency procedure and requires database-owner approval.

After any rollback, keep `SESSION_SECRET`, `CITIZEN_ID_PEPPER`, and ticket/OTP
secrets consistent with the restored data unless the explicit consequence of
rotating them is accepted.
