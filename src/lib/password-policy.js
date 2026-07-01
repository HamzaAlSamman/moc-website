// Isomorphic password-strength validation — intentionally has NO `server-only`
// import so the exact same rules can run both client-side (instant UX feedback)
// and server-side (the only check that actually matters for security; the
// client check is defense-in-depth / UX only and must never be trusted alone).

export const PASSWORD_MIN_LENGTH = 8;

const RULES = [
  {
    id: "length",
    test: (pwd) => pwd.length >= PASSWORD_MIN_LENGTH,
    messageAr: `يجب أن تتكون كلمة المرور من ${PASSWORD_MIN_LENGTH} أحرف على الأقل`,
    messageEn: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
  },
  {
    id: "uppercase",
    test: (pwd) => /[A-Z]/.test(pwd),
    messageAr: "يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)",
    messageEn: "Must contain at least one uppercase letter (A-Z)",
  },
  {
    id: "lowercase",
    test: (pwd) => /[a-z]/.test(pwd),
    messageAr: "يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)",
    messageEn: "Must contain at least one lowercase letter (a-z)",
  },
  {
    id: "number",
    test: (pwd) => /[0-9]/.test(pwd),
    messageAr: "يجب أن تحتوي على رقم واحد على الأقل (0-9)",
    messageEn: "Must contain at least one digit (0-9)",
  },
  {
    id: "special",
    test: (pwd) => /[^A-Za-z0-9]/.test(pwd),
    messageAr: "يجب أن تحتوي على رمز خاص واحد على الأقل (مثل !@#$%)",
    messageEn: "Must contain at least one special character (e.g. !@#$%)",
  },
];

/**
 * @param {string} password
 * @param {"ar"|"en"} [lang]
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePasswordStrength(password, lang = "ar") {
  const pwd = typeof password === "string" ? password : "";
  const errors = RULES.filter((rule) => !rule.test(pwd)).map((rule) =>
    lang === "en" ? rule.messageEn : rule.messageAr
  );
  return { valid: errors.length === 0, errors };
}
