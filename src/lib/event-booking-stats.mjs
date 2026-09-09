// Per-event booking figures, folded from a single Prisma cross-tab.
//
// The caller runs one `groupBy(["status", "attendanceStatus", "source"])` and
// passes the rows here. Counting in the database rather than over a page of
// booking rows matters: the admin list is capped at 5000 rows, so a large
// festival would otherwise be reported with quietly truncated numbers — the
// kind of wrong that looks right.
//
// Pure, so the counting rules are unit-testable and identical everywhere they
// are shown.

/**
 * Status and attendance are independent columns (see EventAttendanceStatus in
 * schema.prisma), so a cancelled booking can still carry NOT_CHECKED_IN. Every
 * figure below is stated in terms of exactly one axis, never a mix.
 *
 * @param {Array<{status: string, attendanceStatus: string, source: string, count: number}>} groups
 * @param {{capacity?: number|null, waitlistEnabled?: boolean}|null} [event]
 */
export function summarizeEventBookings(groups = [], event = null) {
  const rows = (Array.isArray(groups) ? groups : []).map((row) => ({
    status: String(row?.status ?? ""),
    attendanceStatus: String(row?.attendanceStatus ?? ""),
    source: String(row?.source ?? ""),
    count: Number.isFinite(Number(row?.count)) ? Math.max(0, Math.trunc(Number(row.count))) : 0,
  }));

  const sum = (predicate) => rows.reduce((acc, row) => (predicate(row) ? acc + row.count : acc), 0);

  const total = sum(() => true);
  const confirmed = sum((row) => row.status === "CONFIRMED");
  const waitlisted = sum((row) => row.status === "WAITLISTED");
  const cancelled = sum((row) => row.status === "CANCELLED");

  // Attendance only counts bookings that were still active at event time: a
  // seat released beforehand is not a no-show against anyone.
  const isActive = (row) => row.status !== "CANCELLED";
  const attended = sum((row) => isActive(row) && row.attendanceStatus === "ATTENDED");
  const noShow = sum((row) => isActive(row) && row.attendanceStatus === "NO_SHOW");
  const notCheckedIn = sum((row) => isActive(row) && row.attendanceStatus === "NOT_CHECKED_IN");

  // Rate over settled bookings only — an event still ahead sits entirely at
  // NOT_CHECKED_IN and would otherwise read as 0% attendance.
  const settled = attended + noShow;
  const attendanceRate = settled ? Math.round((attended / settled) * 100) : null;

  // Turnout answers a different question from attendanceRate: of the seats the
  // ministry actually gave out, how many walked through the door. It is only
  // meaningful once someone has been checked in.
  const turnoutRate = confirmed && (attended || noShow) ? Math.round((attended / confirmed) * 100) : null;
  const cancellationRate = total ? Math.round((cancelled / total) * 100) : null;

  const bySource = {
    citizen: sum((row) => row.source === "CITIZEN"),
    admin: sum((row) => row.source === "ADMIN"),
  };

  const capacity = Number.isInteger(event?.capacity) && event.capacity > 0 ? event.capacity : null;
  const seatsLeft = capacity === null ? null : Math.max(0, capacity - confirmed);
  // Can exceed 100 only if the counter and the rows disagree; clamping would
  // hide that, so the raw ratio is reported and the caller can flag it.
  const fillRate = capacity === null ? null : Math.round((confirmed / capacity) * 100);

  return {
    total,
    confirmed,
    waitlisted,
    cancelled,
    attended,
    noShow,
    notCheckedIn,
    settled,
    attendanceRate,
    turnoutRate,
    cancellationRate,
    bySource,
    capacity,
    seatsLeft,
    fillRate,
    waitlistEnabled: Boolean(event?.waitlistEnabled),
  };
}

/**
 * Prisma's groupBy returns `_count`, not `count`. Kept next to the summarizer
 * so every caller shapes the rows the same way.
 *
 * @param {Array<object>} groups raw prisma groupBy output
 */
export function normalizeBookingGroups(groups = []) {
  return (Array.isArray(groups) ? groups : []).map((row) => ({
    status: row.status,
    attendanceStatus: row.attendanceStatus,
    source: row.source,
    count: row?._count?._all ?? row?._count ?? 0,
  }));
}
