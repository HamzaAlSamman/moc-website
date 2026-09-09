// Month filtering for the "which directorates fed the calendar" dashboard
// panel. Pure and dependency-free so the value list, the range it maps to, and
// the validation the page applies to an incoming query string all agree.

// Levantine month names, matching the public cultural calendar (e.g. "أيلول"
// for September) rather than the Gulf/MSA set — same vocabulary the rest of
// this site already uses.
export const ARABIC_MONTHS = Object.freeze([
  "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
  "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول",
]);

const MONTH_PARAM_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** "2026-09" -> { year: 2026, month: 9 } (1-indexed), or null if malformed. */
export function parseMonthParam(value) {
  const match = MONTH_PARAM_RE.exec(String(value ?? ""));
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
}

/** UTC [start, end) range covering the given "YYYY-MM" month, end exclusive. */
export function monthRange(monthParam) {
  const parsed = parseMonthParam(monthParam);
  if (!parsed) return null;
  const { year, month } = parsed;
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

export function monthLabel(monthParam) {
  const parsed = parseMonthParam(monthParam);
  if (!parsed) return "";
  return `${ARABIC_MONTHS[parsed.month - 1]} ${parsed.year}`;
}

/**
 * Selectable months for the filter: the current year in full, so the list
 * matches the "٢٠٢٦" scope the public cultural calendar already uses, plus
 * whichever extra months already hold an event outside that year — a past
 * import or a far-future booking is still reachable instead of silently
 * excluded from the filter.
 */
export function buildMonthOptions(now = new Date(), extraYears = []) {
  const years = [...new Set([now.getUTCFullYear(), ...extraYears])].sort((a, b) => a - b);
  return years.flatMap((year) =>
    ARABIC_MONTHS.map((labelAr, index) => {
      const month = index + 1;
      return { value: `${year}-${String(month).padStart(2, "0")}`, labelAr: `${labelAr} ${year}` };
    }),
  );
}
