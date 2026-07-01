import { readFile } from "node:fs/promises";

const carousel = await readFile("src/components/AchievementCarousel.jsx", "utf8");

const forbiddenMarkers = [
  "Multi-slide badge",
  "M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6",
];

const found = forbiddenMarkers.filter((marker) => carousel.includes(marker));

if (found.length > 0) {
  console.error("Achievements carousel still contains the corner gallery/photos overlay icon.");
  for (const marker of found) {
    console.error(`Found marker: ${marker}`);
  }
  process.exit(1);
}
