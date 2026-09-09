// Minimal RFC 5545 calendar file for a single cultural event, so "add to
// calendar" works in Outlook, Apple Calendar and Google Calendar without
// sending the citizen through a third-party service. Pure, so the escaping
// and folding rules are unit-testable.

const PRODID = "-//Syrian Ministry of Culture//Cultural Calendar//AR";

// Two hours is the house default for an event with no declared end: long
// enough that the entry does not look instantaneous in a calendar grid.
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

/** RFC 5545 §3.3.5: UTC date-time, e.g. 20260814T173000Z */
export function icsDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid calendar date");
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/** RFC 5545 §3.3.11: backslash, semicolon, comma and newlines are special. */
export function icsEscape(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * RFC 5545 §3.1: no line may exceed 75 octets. Continuations start with a
 * single space. Counted in octets, not characters — Arabic content is
 * multi-byte and a naive character count produces lines parsers reject.
 */
export function icsFold(line) {
  const encoder = new TextEncoder();
  const chars = [...line];
  const out = [];
  let current = "";
  let bytes = 0;
  for (const char of chars) {
    const size = encoder.encode(char).length;
    // 75 for the first line, 74 for continuations (the leading space counts).
    const limit = out.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      out.push(current);
      current = char;
      bytes = size;
    } else {
      current += char;
      bytes += size;
    }
  }
  out.push(current);
  return out.map((part, index) => (index === 0 ? part : ` ${part}`)).join("\r\n");
}

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {{uid: string, title: string, description?: string, location?: string,
 *   start: string|Date, end?: string|Date|null, url?: string, stamp?: string|Date}} event
 * @returns {string} the .ics document, CRLF-terminated
 */
export function buildEventIcs(event) {
  if (!event?.uid || !event?.title || !event?.start) {
    throw new Error("A calendar entry needs at least a uid, a title and a start");
  }
  const start = new Date(event.start);
  const end = event.end ? new Date(event.end) : new Date(start.getTime() + DEFAULT_DURATION_MS);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${icsEscape(event.uid)}`,
    `DTSTAMP:${icsDate(event.stamp ?? new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(event.title)}`,
  ];
  const description = stripHtml(event.description).slice(0, 900);
  if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`);
  if (event.location) lines.push(`LOCATION:${icsEscape(event.location)}`);
  if (event.url) lines.push(`URL:${icsEscape(event.url)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");

  return `${lines.map(icsFold).join("\r\n")}\r\n`;
}
