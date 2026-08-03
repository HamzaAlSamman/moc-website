function timestamp(value) {
  if (value == null) return null;
  const result = new Date(value).getTime();
  return Number.isFinite(result) ? result : null;
}

export function bookingWindowState(event, now = new Date()) {
  if (event?.bookingAvailability === "DISABLED") return "DISABLED";
  if (event?.bookingAvailability !== "OPEN") return "CLOSED";

  const current = timestamp(now);
  const opens = timestamp(event.bookingOpensAt);
  const closes = timestamp(event.bookingClosesAt);
  if (opens !== null && current < opens) return "NOT_OPEN_YET";
  if (closes !== null && current >= closes) return "CLOSED";
  return "OPEN";
}

export function remainingSpots(event) {
  if (!Number.isInteger(event?.capacity) || event.capacity <= 0) return 0;
  const booked = Number.isInteger(event.bookedCount) && event.bookedCount > 0
    ? event.bookedCount
    : 0;
  return Math.max(0, event.capacity - booked);
}

export function bookingOutcome(event) {
  if (remainingSpots(event) > 0) return "CONFIRMED";
  return event?.waitlistEnabled ? "WAITLISTED" : "FULL";
}

export function canEnableInternalBooking(event) {
  if (event?.source !== "MOC") return { ok: false, code: "EXTERNAL_SOURCE" };
  if (event.bookingUrl) return { ok: false, code: "EXTERNAL_BOOKING_URL" };
  if (!Number.isInteger(event.capacity) || event.capacity <= 0) {
    return { ok: false, code: "INVALID_CAPACITY" };
  }
  const bookedCount = Number.isInteger(event.bookedCount) ? event.bookedCount : 0;
  if (event.capacity < bookedCount) return { ok: false, code: "CAPACITY_BELOW_BOOKED" };

  const opens = timestamp(event.bookingOpensAt);
  const closes = timestamp(event.bookingClosesAt);
  const starts = timestamp(event.startDate);
  if (
    (opens !== null && closes !== null && opens >= closes)
    || (closes !== null && starts !== null && closes > starts)
  ) {
    return { ok: false, code: "INVALID_BOOKING_WINDOW" };
  }
  return { ok: true };
}

export function citizenMayBook(citizen) {
  return Boolean(
    citizen?.emailVerifiedAt
    && citizen.identityStatus === "VERIFIED"
    && citizen.isActive
    && !citizen.isBlocked
  );
}
