import "server-only";

import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { prisma } from "./prisma";
import { sendMail, wrapMinistryEmail } from "./mailer";
import { reconcileBookedCount } from "./event-booking-service";
import { citizenTicketPageUrl } from "./booking-ticket-code.mjs";
import { generateBookingTicketPdf } from "./booking-ticket-pdf";
import {
  createNotificationOutboxProcessor,
  isGenericEmail,
  notificationCarriesTicket,
  renderOutboxNotification,
} from "./notification-outbox-core.mjs";

const STALE_LOCK_MS = 15 * 60 * 1000;

export function createPrismaOutboxRepository(client = prisma) {
  return Object.freeze({
    // `onlyId` narrows the same claim to a single row, so an immediate send (or
    // an operator pressing "أرسل الآن") runs through the identical lock/attempt
    // bookkeeping as the cron worker instead of a second, divergent path.
    claimBatch({ workerId, batchSize, now, onlyId = null }) {
      const limit = onlyId ? 1 : Math.max(1, Math.min(200, Number(batchSize) || 50));
      const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);
      return client.$transaction(async (tx) => {
        const candidates = await tx.$queryRaw(Prisma.sql`
          SELECT "id"
          FROM "NotificationOutbox"
          WHERE "attempts" < "maxAttempts"
            AND (
              ("status" = 'PENDING' AND "availableAt" <= ${now})
              OR ("status" = 'PROCESSING' AND "lockedAt" < ${staleBefore})
            )
            ${onlyId ? Prisma.sql`AND "id" = ${onlyId}` : Prisma.empty}
          ORDER BY "availableAt" ASC, "createdAt" ASC, "id" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ${limit}
        `);
        const ids = candidates.map((row) => row.id);
        if (!ids.length) return [];
        await tx.notificationOutbox.updateMany({
          where: { id: { in: ids } },
          data: { status: "PROCESSING", attempts: { increment: 1 }, lockedAt: now, lockedBy: workerId },
        });
        return tx.notificationOutbox.findMany({ where: { id: { in: ids }, lockedBy: workerId }, orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }, { id: "asc" }] });
      }, { maxWait: 30_000, timeout: 30_000 });
    },
    async markSent(row, { workerId, sentAt }) {
      const result = await client.notificationOutbox.updateMany({ where: { id: row.id, status: "PROCESSING", lockedBy: workerId }, data: { status: "SENT", sentAt, lastError: null, lockedAt: null, lockedBy: null } });
      if (result.count !== 1) throw new Error("Outbox lock ownership changed before SENT update");
    },
    async markFailed(row, { workerId, terminal, error, availableAt }) {
      const result = await client.notificationOutbox.updateMany({ where: { id: row.id, status: "PROCESSING", lockedBy: workerId }, data: { status: terminal ? "FAILED" : "PENDING", lastError: error, availableAt, lockedAt: null, lockedBy: null } });
      if (result.count !== 1) throw new Error("Outbox lock ownership changed before failure update");
    },
  });
}

// Renders the ticket for a seat-bearing notification, and never lets that
// rendering decide whether the citizen hears from us at all.
//
// The PDF needs a system Chromium and APP_BASE_URL (see AGENTS.md). If either
// is missing on the server, throwing here would mark the outbox row failed,
// retry it eight times over a day and then give up — so a server-side
// misconfiguration would silently swallow every booking confirmation, not just
// the attachment. Instead the failure is logged with the same `code`
// vocabulary the ticket-pdf route uses, and the mail goes out without it.
async function buildTicketExtras(type, booking) {
  if (!booking || !notificationCarriesTicket(type) || booking.status === "CANCELLED") {
    return { ticketUrl: "", ticketAttached: false, attachments: undefined };
  }

  let ticketUrl = "";
  try {
    ticketUrl = citizenTicketPageUrl({ referenceNo: booking.referenceNo });
  } catch (error) {
    console.error(`Booking ticket link omitted for ${booking.referenceNo}:`, error.message);
  }

  try {
    const pdf = await generateBookingTicketPdf(booking);
    return {
      ticketUrl,
      ticketAttached: true,
      // ASCII filename: the reference number is BKG-YYYY-NNNN, so no client
      // has to deal with RFC 2231 encoding for a mail attachment.
      attachments: [{
        filename: `ticket-${booking.referenceNo}.pdf`,
        content: pdf,
        contentType: "application/pdf",
      }],
    };
  } catch (error) {
    const code = error?.code === "CHROMIUM_MISSING" ? "PDF_ENGINE_UNAVAILABLE"
      : /APP_BASE_URL/.test(error?.message || "") ? "APP_BASE_URL_MISSING"
      : "PDF_RENDER_FAILED";
    console.error(
      `Booking ticket attachment skipped [${code}] for ${booking.referenceNo}:`,
      error,
    );
    if (code !== "PDF_RENDER_FAILED") {
      console.error("  ↳ إعداد ناقص على الخادم. راجع قسم «تذاكر الفعاليات وملفات PDF» في AGENTS.md.");
    }
    // The link still works, and the citizen can download the ticket from their
    // account even while the server cannot render one into an email.
    return { ticketUrl, ticketAttached: false, attachments: undefined };
  }
}

// A queued generic email is already composed — sending it is replaying the
// stored message, never re-rendering it. Attachments ride along as base64 when
// they were small enough to keep (see queued-mail.js), so a resend months later
// still carries the same receipt the citizen was originally promised.
function sendGenericEmail(row) {
  const payload = row.payloadJson || {};
  const attachments = Array.isArray(payload.attachments)
    ? payload.attachments.map(({ filename, contentType, contentBase64 }) => ({
        filename,
        contentType,
        content: Buffer.from(contentBase64, "base64"),
      }))
    : undefined;
  return sendMail({
    to: row.recipient,
    ...(payload.from ? { from: payload.from } : {}),
    subject: payload.subject,
    ...(payload.text ? { text: payload.text } : {}),
    html: payload.html,
    ...(attachments?.length ? { attachments } : {}),
  });
}

export async function sendOutboxNotification(row) {
  if (isGenericEmail(row.type)) return sendGenericEmail(row);

  let booking = null;
  if (row.payloadJson?.bookingId) {
    booking = await prisma.eventBooking.findUnique({
      where: { id: row.payloadJson.bookingId },
      // Wider than the email itself needs: the extra columns are what
      // generateBookingTicketPdf renders the attachment from.
      select: {
        referenceNo: true,
        fullName: true,
        nationalIdLast4: true,
        status: true,
        attendanceStatus: true,
        ticketSig: true,
        event: { select: { titleAr: true, startDate: true, location: true, governorate: true } },
      },
    });
  }
  const { ticketUrl, ticketAttached, attachments } = await buildTicketExtras(row.type, booking);
  const payload = {
    ...(row.payloadJson || {}),
    ...(booking ? { referenceNo: booking.referenceNo, fullName: booking.fullName, eventTitle: booking.event.titleAr, eventStart: booking.event.startDate, eventLocation: booking.event.location } : {}),
    ticketUrl,
    ticketAttached,
  };
  const message = renderOutboxNotification(row.type, payload);
  return sendMail({
    to: row.recipient,
    subject: message.subject,
    text: message.text,
    html: wrapMinistryEmail({ directorate: "منصة الخدمات الإلكترونية", titleAr: message.title, contentHtml: message.html }),
    ...(attachments ? { attachments } : {}),
  });
}

export async function processNotificationOutbox({ workerId = randomUUID(), batchSize = process.env.OUTBOX_BATCH_SIZE, onlyId } = {}) {
  const processor = createNotificationOutboxProcessor({ repository: createPrismaOutboxRepository(), send: sendOutboxNotification });
  return processor.process({ workerId, batchSize, onlyId });
}

/**
 * Deliver one queued row right now, without waiting for the cron worker.
 *
 * Producers call this straight after queueing so the citizen still gets the
 * mail in the same request they submitted; the admin screen calls it behind
 * "أرسل الآن". Never throws: a failure is already recorded on the row by the
 * processor, and the caller's own request must not fail because mail did.
 */
export async function deliverOutboxRowNow(id) {
  try {
    return await processNotificationOutbox({ workerId: `now-${randomUUID()}`, onlyId: id });
  } catch (error) {
    console.error(`Immediate outbox delivery failed for ${id}:`, error);
    return { claimed: 0, sent: 0, retried: 0, failed: 0 };
  }
}

/**
 * Operator-triggered resend. A row that exhausted its eight attempts is FAILED
 * and no longer claimable, so a manual retry has to clear the counter — this is
 * a person deciding to start delivery over, not the worker looping.
 */
export async function retryOutboxRow(id) {
  const reset = await prisma.notificationOutbox.updateMany({
    where: { id, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "PENDING", attempts: 0, availableAt: new Date(), lastError: null, lockedAt: null, lockedBy: null },
  });
  if (reset.count !== 1) return { retried: false, result: null };
  return { retried: true, result: await deliverOutboxRowNow(id) };
}

export async function runCitizenBookingMaintenance({ now = new Date() } = {}) {
  const ttlHours = Math.max(1, Math.min(720, Number(process.env.UNVERIFIED_CITIZEN_TTL_HOURS) || 24));
  const unverifiedCutoff = new Date(now.getTime() - ttlHours * 60 * 60 * 1000);
  const historyCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [unverifiedCitizens, emailOtps, tokens, reconciliation] = await Promise.all([
    prisma.citizen.deleteMany({ where: { emailVerifiedAt: null, createdAt: { lt: unverifiedCutoff } } }),
    prisma.citizenEmailOtp.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { consumedAt: { lt: historyCutoff } }, { revokedAt: { lt: historyCutoff } }] } }),
    prisma.citizenToken.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { consumedAt: { lt: historyCutoff } }] } }),
    reconcileBookedCount({ apply: false }),
  ]);
  return { deleted: { unverifiedCitizens: unverifiedCitizens.count, emailOtps: emailOtps.count, tokens: tokens.count }, reconciliation };
}
