// Attendance figures for one citizen, derived from their booking rows.
// Pure so the counting rules are unit-testable and identical wherever they
// are shown; the caller does the Prisma query.

/**
 * Booking status and attendance are independent columns (see the comment on
 * EventAttendanceStatus in schema.prisma), so a cancelled booking can still
 * carry NOT_CHECKED_IN. Every figure below is therefore stated in terms of
 * exactly one of the two axes, never a mix.
 *
 * @param {Array<{status: string, attendanceStatus: string}>} bookings
 */
export function summarizeCitizenAttendance(bookings = []) {
  const rows = Array.isArray(bookings) ? bookings : [];

  const total = rows.length;
  const confirmed = rows.filter((row) => row.status === "CONFIRMED").length;
  const waitlisted = rows.filter((row) => row.status === "WAITLISTED").length;
  const cancelled = rows.filter((row) => row.status === "CANCELLED").length;

  // Attendance is only meaningful for bookings that were still active: a seat
  // the citizen released before the event is not a no-show against them.
  const active = rows.filter((row) => row.status !== "CANCELLED");
  const attended = active.filter((row) => row.attendanceStatus === "ATTENDED").length;
  const noShow = active.filter((row) => row.attendanceStatus === "NO_SHOW").length;
  const pending = active.filter((row) => row.attendanceStatus === "NOT_CHECKED_IN").length;

  // Rate over settled bookings only — a future event still sitting at
  // NOT_CHECKED_IN would otherwise drag every rate toward zero.
  const settled = attended + noShow;
  const attendanceRate = settled ? Math.round((attended / settled) * 100) : null;

  return { total, confirmed, waitlisted, cancelled, attended, noShow, pending, settled, attendanceRate };
}
