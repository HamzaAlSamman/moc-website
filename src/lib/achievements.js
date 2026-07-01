// Shared constants/helpers for achievement display, used by both the public
// achievements pages and the admin achievement form. Keeping a single source
// here ensures the auto-generated achievement titles ("أبرز أعمال … <month>")
// and the public month groupings always use identical month names.

export const monthNamesAr = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export const monthNamesEn = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Tags in this set are rendered in the "gold" accent; everything else uses the
// teal accent. Returns the Tailwind classes for the tag chip.
const GOLD_TAGS = ["Heritage", "Theatre", "International", "Archaeology", "Museums", "Cinema", "Youth"];

export function getTagColor(tagEn) {
  return GOLD_TAGS.includes(tagEn)
    ? "text-[#988561] bg-[#002723]/80 border-[#988561]/35"
    : "text-[#428177] bg-[#002723]/80 border-[#428177]/40";
}
