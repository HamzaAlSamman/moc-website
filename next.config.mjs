import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV !== "production";

// Defense-in-depth Content-Security-Policy for the public site + admin panel.
// `script-src` keeps 'unsafe-inline' because Next.js injects inline bootstrap
// scripts (a nonce-based policy would require per-request middleware); 'unsafe-eval'
// is only added in development, where the webpack dev runtime needs it — production
// runs without it. The non-script directives below (frame-ancestors, object-src,
// base-uri, form-action) cost nothing and meaningfully shrink the attack surface
// (clickjacking, plugin/object injection, <base> hijacking, off-site form posts).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' https:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Uploaded media is user/CMS-supplied; force download-only handling so a
        // mis-typed file (e.g. an .html disguised as an image) can never be
        // rendered/executed by the browser when opened directly.
        source: "/uploads/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Disposition", value: "inline" },
          { key: "Content-Security-Policy", value: "sandbox" },
        ],
      },
    ];
  },
  images: {
    // Serve modern formats (much smaller than JP/PNG) and cache optimized
    // variants longer so repeat visitors don't re-fetch/re-encode.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000, // 30 days
    remotePatterns: [
      // moc.gov.sy internal dashboard (where scraped images are hosted)
      {
        protocol: "https",
        hostname: "dashboard.qmindtech-ai.net",
        pathname: "/**",
      },
      // moc.gov.sy main domain
      {
        protocol: "https",
        hostname: "moc.gov.sy",
        pathname: "/**",
      },
      // Any subdomain of moc.gov.sy
      {
        protocol: "https",
        hostname: "**.moc.gov.sy",
        pathname: "/**",
      },
      // Wikipedia (used in test articles)
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
