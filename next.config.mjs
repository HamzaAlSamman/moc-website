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
