// Treat a bare datetime-local string (e.g. "2026-06-21T14:30", no timezone) as
// UTC instead of the server's local time, so dates entered in the admin forms
// are stored consistently regardless of where the server runs. Strings that
// already carry a "Z" or an explicit offset, and Date objects, pass through
// unchanged. Empty/nullish input returns null.
export function parseDateAsUTC(str) {
  if (!str) return null;
  if (str instanceof Date) return str;
  if (str.includes("T") && !str.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(str)) {
    return new Date(str + "Z");
  }
  return new Date(str);
}
