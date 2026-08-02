// Shared display labels/parsers for event submissions.
// Used by the admin table, the detail view and the printable reports so the
// three surfaces can never drift apart in their wording.

export const STATUS_LABELS = {
  PENDING:      "قيد الانتظار",
  UNDER_REVIEW: "قيد الدراسة",
  APPROVED:     "موافق عليه",
  CONDITIONAL:  "موافقة مشروطة",
  REJECTED:     "مرفوض",
};

export const ENTITY_LABELS = {
  DIRECTORATE: "مديرية",
  GOVERNMENT:  "جهة حكومية",
  EXTERNAL:    "جهة خارجية / أهلية / فنية",
  INDIVIDUAL:  "فرد / مثقف مستقل",
};

export const GOAL_LABELS = {
  cultural:  "ثقافي",
  youth:     "شبابي",
  heritage:  "تراثي",
  education: "تعليمي / تدريبي",
  community: "مجتمعي",
  leisure:   "ترفيهي هادف",
  capacity:  "تمكين وبناء قدرات",
};

export const SPONSORSHIP_LABELS = {
  financial: "مالية",
  legal:     "قانونية",
  other:     "غير ذلك",
};

export const EVENT_TYPE_LABELS = {
  central: "مركزية",
  joint:   "مشتركة",
};

/** Goals are stored as a JSON array; free-text entries arrive as "other:…". */
export function parseGoals(str) {
  try {
    return JSON.parse(str || "[]").map((g) =>
      g.startsWith("other:") ? g.slice(6) : (GOAL_LABELS[g] || g)
    );
  } catch {
    return [];
  }
}

export function parseSponsorship(str) {
  try {
    return JSON.parse(str || "[]").map((s) => SPONSORSHIP_LABELS[s] || s);
  } catch {
    return [];
  }
}

export function eventTypeLabel(value) {
  return EVENT_TYPE_LABELS[value] || value || "";
}

/** Gregorian Arabic date, optionally with time. Falls back to the raw string. */
export function formatArabicDate(value, { withTime = false } = {}) {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (isNaN(parsed)) return String(value);
  return new Date(parsed).toLocaleDateString("ar-SY-u-ca-gregory", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: true } : {}),
  });
}

/**
 * The proposed date is a free-text field: users may type "خلال شهر أيلول" or
 * pick a real datetime. Only format it when it actually looks like a datetime.
 */
export function formatProposedDate(val) {
  if (!val) return "—";
  const parsed = Date.parse(val);
  if (!isNaN(parsed) && val.includes("-") && (val.includes("T") || val.includes(":"))) {
    return formatArabicDate(val, { withTime: true });
  }
  return val;
}
