// The ministry's hexagon identity as a ~0.6 KB seamless tile.
//
// There is also `public/svg/pattern-hex.svg` — a 136 KB, 1920×1080 artwork.
// It is fine as a page background served once and cached, and wrong anywhere
// the bytes travel with the document:
//
//   - Emails: embedding it pushed the message past Gmail's 102 KB clipping
//     limit and hurt spam scoring (this tile was written for that reason).
//   - PDFs: Chromium rasterizes a repeating background into the output, so
//     tiling it across the ticket header cost 569 KB of a 745 KB file — 76%
//     of a document now attached to every booking confirmation email.
//
// Keeping one definition here means the next document that wants the identity
// gets the cheap one by default instead of rediscovering this the hard way.
//
// Pure and dependency-free so it can be imported from a `server-only` mailer,
// a PDF generator, and a test alike.

const TILE_PATH =
  "M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z";

/**
 * @param {{color?: string, opacity?: number}} [options]
 * @returns {string} raw SVG markup for one tile
 */
export function ministryHexTile({ color = "#002723", opacity = 0.05 } = {}) {
  return (
    "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'>" +
    `<path fill='${color}' fill-opacity='${opacity}' fill-rule='evenodd' d='${TILE_PATH}'/>` +
    "</svg>"
  );
}

/** The same tile as a `data:` URI, ready to drop into `background-image`. */
export function ministryHexTileDataUri(options) {
  return `data:image/svg+xml,${encodeURIComponent(ministryHexTile(options))}`;
}
