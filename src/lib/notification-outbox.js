import "server-only";

import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { prisma } from "./prisma";
import { sendMail, wrapMinistryEmail } from "./mailer";
import { reconcileBookedCount } from "./event-booking-service";
import { createNotificationOutboxProcessor, renderOutboxNotification } from "./notification-outbox-core.mjs";

const STALE_LOCK_MS = 15 * 60 * 1000;

export function createPrismaOutboxRepository(client = prisma) {
  return Object.freeze({
    claimBatch({ workerId, batchSize, now }) {
      const limit = Math.max(1, Math.min(200, Number(batchSize) || 50));
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

export async function sendOutboxNotification(row) {
  let booking = null;
  if (row.payloadJson?.bookingId) {
    booking = await prisma.eventBooking.findUnique({
      where: { id: row.payloadJson.bookingId },
      select: { referenceNo: true, fullName: true, event: { select: { titleAr: true, startDate: true, location: true } } },
    });
  }
  const payload = {
    ...(row.payloadJson || {}),
    ...(booking ? { referenceNo: booking.referenceNo, fullName: booking.fullName, eventTitle: booking.event.titleAr, eventStart: booking.event.startDate, eventLocation: booking.event.location } : {}),
  };
  const message = renderOutboxNotification(row.type, payload);
  return sendMail({
    to: row.recipient,
    subject: message.subject,
    text: message.text,
    html: wrapMinistryEmail({ directorate: "منصة الخدمات الإلكترونية", titleAr: message.title, contentHtml: message.html }),
  });
}

export async function processNotificationOutbox({ workerId = randomUUID(), batchSize = process.env.OUTBOX_BATCH_SIZE } = {}) {
  const processor = createNotificationOutboxProcessor({ repository: createPrismaOutboxRepository(), send: sendOutboxNotification });
  return processor.process({ workerId, batchSize });
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
