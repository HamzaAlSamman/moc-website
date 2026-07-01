import { readFile } from "node:fs/promises";

const page = await readFile("src/app/[locale]/services/internal-oversight/page.js", "utf8");
const route = await readFile("src/app/api/oversight-complaints/route.js", "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exitCode = 1;
  }
}

assert(
  page.includes("const emailRegex ="),
  "Client form must validate email format when identity is provided.",
);
assert(
  page.includes("!form.isAnonymous && !form.name.trim()"),
  "Client form must require name when anonymous mode is not selected.",
);
assert(
  page.includes("!form.isAnonymous && !emailRegex.test(form.email.trim())"),
  "Client form must require a valid email when anonymous mode is not selected.",
);
assert(
  page.includes("!form.isAnonymous && (!form.phone.trim() || form.phone === \"+\")"),
  "Client form must require phone when anonymous mode is not selected.",
);
assert(
  page.includes("<Field label={tForm.nameLabel} required={!form.isAnonymous}>"),
  "Name field must be visually marked required when anonymous mode is not selected.",
);
assert(
  page.includes("<Field label={tForm.emailLabel} required={!form.isAnonymous}>"),
  "Email field must be visually marked required when anonymous mode is not selected.",
);
assert(
  page.includes("<Field label={tForm.phoneLabel} required={!form.isAnonymous}>"),
  "Phone field must be visually marked required when anonymous mode is not selected.",
);
assert(
  route.includes("if (!isAnonymous && (!name || !email || !phone))"),
  "API route must reject non-anonymous complaints without name, email, and phone.",
);
assert(
  route.includes("if (!isAnonymous && !emailRegex.test(email))"),
  "API route must reject invalid non-anonymous email addresses.",
);
