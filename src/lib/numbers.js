/**
 * Convert Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) to Western (0123456789)
 */
export function toWesternNums(str) {
  if (!str) return str;
  return String(str).replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x0660);
}
