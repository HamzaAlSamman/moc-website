import { readFile } from "node:fs/promises";

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exitCode = 1;
  }
}

let home = "";
let component = "";

try {
  home = await readFile("src/app/[locale]/page.js", "utf8");
} catch (error) {
  console.error(`Unable to read homepage: ${error.message}`);
  process.exit(1);
}

try {
  component = await readFile("src/components/HomeServicesSection.jsx", "utf8");
} catch (error) {
  console.error(`Unable to read HomeServicesSection: ${error.message}`);
  process.exit(1);
}

const newsIndex = home.indexOf("<NewsSection locale={locale} />");
const servicesIndex = home.indexOf("<HomeServicesSection locale={locale} />");
const calendarIndex = home.indexOf("<CulturalCalendarSection locale={locale} />");

assert(home.includes("HomeServicesSection"), "Home page must render HomeServicesSection");
assert(newsIndex !== -1, "Home page must still render NewsSection");
assert(calendarIndex !== -1, "Home page must still render CulturalCalendarSection");
assert(
  newsIndex < servicesIndex && servicesIndex < calendarIndex,
  "HomeServicesSection must appear after NewsSection and before CulturalCalendarSection",
);

const order = ["internal-oversight", "event-submission", "international-cooperation"];
let lastIndex = -1;
for (const id of order) {
  const index = component.indexOf(`id: "${id}"`);
  assert(index > lastIndex, `${id} must appear in the expected service order`);
  lastIndex = index;
}

assert(component.includes("featured: true"), "Internal oversight card must have restrained emphasis");
assert(component.includes("الخدمات الإلكترونية"), "Section must include the Arabic title");
assert(component.includes("`/${locale}/services/internal-oversight`"), "Internal oversight link must include locale");
assert(component.includes("`/${locale}/services/submit-event`"), "Event submission link must include locale");
assert(component.includes("`/${locale}/services/international-cooperation`"), "International cooperation link must include locale");
assert(component.includes("`/${locale}/services`"), "All services CTA must include locale");
