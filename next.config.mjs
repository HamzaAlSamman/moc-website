import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV !== "production";

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
  experimental: {
    proxyClientMaxBodySize: "170mb",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // HSTS: after the first HTTPS visit the browser refuses plain HTTP to
          // this host for a year, closing the SSL-strip window between a user
          // typing "moc.gov.sy" and the 301 to HTTPS. Deliberately no
          // `preload` and no `includeSubDomains` yet — both are near-permanent
          // commitments (preload is baked into browsers; includeSubDomains can
          // strand an HTTP-only subdomain). Raise to those only after every
          // subdomain is confirmed HTTPS-only.
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // The ticket-scanning screen is the one place in the site that needs a
      // camera: it decodes the encrypted ticket QR in the browser. The blanket
      // `camera=()` above would otherwise make getUserMedia fail there with a
      // permissions-policy error the officer cannot do anything about — a
      // browser-level block, so no amount of "allow camera" tapping helps.
      // Kept as a single exact path rather than a prefix so nothing else on
      // /admin inherits it.
      {
        source: "/admin/scan",
        headers: [
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
      {
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
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dashboard.qmindtech-ai.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "moc.gov.sy",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.moc.gov.sy",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
      // The deployed Opera site currently serves HTTP. Keep HTTPS patterns too
      // so enabling TLS later does not require another application release.
      {
        protocol: "http",
        hostname: "damasopera.gov.sy",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "**.damasopera.gov.sy",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "damasopera.gov.sy",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.damasopera.gov.sy",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
