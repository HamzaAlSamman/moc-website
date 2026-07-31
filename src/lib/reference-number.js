import "server-only";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Human-readable sequential reference numbers for citizen requests.
//
// Every public channel (complaints, event requests, copyright deposits, contact
// messages) issues a number of the form  PREFIX-YYYY-NNNN  — e.g. OVS-2026-0042.
// The citizen sees it in their confirmation email and the directorate sees the
// same number in the notification it receives, so a phone call about "شكوى رقم
// OVS-2026-0042" can be traced without asking for names or dates.
//
// Why not just use the cuid primary key: a cuid is 25 opaque characters, and
// nobody can read it over the phone or write it on a paper file. Why per-year:
// the ministry files paperwork by year, and restarting each January keeps the
// serial short.
//
// The sequence lives in the ReferenceCounter table so the two email-only
// services (oversight complaints, contact) — which persist nothing else — can
// still hand out real sequential numbers.
// ─────────────────────────────────────────────────────────────────────────────

/** Service → reference prefix. Keep prefixes stable: they end up on paper. */
export const REFERENCE_SCOPES = {
  OVERSIGHT:        "OVS", // شكاوى الرقابة الداخلية
  EVENT_SUBMISSION: "EVT", // طلبات إقامة الفعاليات
  COPYRIGHT:        "CPR", // طلبات حماية حقوق المؤلف
  CONTACT:          "MSG", // رسائل "اتصل بنا"
  COOPERATION:      "COP", // طلبات التعاون الدولي
  LEGAL_LICENSE:    "LIC", // Legal-license applications
};

const PAD = 4; // 0001 … 9999, then it simply grows wider.

function format(scope, year, seq) {
  return `${scope}-${year}-${String(seq).padStart(PAD, "0")}`;
}

/**
 * Reserve and return the next reference number for a service.
 *
 * The increment happens inside the database (`seq: { increment: 1 }`), so two
 * concurrent submissions can never receive the same number. The only race is on
 * the very first request of a year, where two callers may both try to CREATE the
 * counter row; the loser hits the primary-key conflict (P2002) and we simply
 * retry, at which point the row exists and the UPDATE path takes over.
 *
 * @param {string} scope One of REFERENCE_SCOPES.
 * @param {Date}  [now]  Injectable clock, for tests.
 * @returns {Promise<string>} e.g. "OVS-2026-0042"
 */
export async function nextReferenceNumber(scope, now = new Date()) {
  const year = now.getFullYear();

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const counter = await prisma.referenceCounter.upsert({
        where: { scope_year: { scope, year } },
        create: { scope, year, seq: 1 },
        update: { seq: { increment: 1 } },
      });
      return format(scope, year, counter.seq);
    } catch (error) {
      if (error?.code === "P2002") continue; // Lost the create race — retry.
      throw error;
    }
  }

  throw new Error(`Could not allocate a reference number for ${scope}/${year}`);
}

/**
 * Same as nextReferenceNumber, but never throws: the caller gets `null` if the
 * counter is unreachable. Used by the email-only services, where failing to
 * allocate a number must not cost the citizen their complaint — the message
 * still goes out, just without a serial.
 */
export async function nextReferenceNumberSafe(scope, now = new Date()) {
  try {
    return await nextReferenceNumber(scope, now);
  } catch (error) {
    console.error(`Reference number allocation failed (${scope}):`, error);
    return null;
  }
}
