import "server-only";

// Simple in-memory sliding-window limiter. Good enough for a single-instance
// deployment (per memory: deployed to one Windows Server, no Redis available).
// Keyed by caller-supplied key (e.g. "login:<ip>") so different endpoints can
// have independent budgets.
const buckets = new Map();

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, hits] of buckets) {
    const fresh = hits.filter((t) => now - t < CLEANUP_INTERVAL_MS);
    if (fresh.length === 0) buckets.delete(key);
    else buckets.set(key, fresh);
  }
}

/**
 * @param {string} key unique bucket key, e.g. `${routeName}:${ip}`
 * @param {number} limit max hits allowed within windowMs
 * @param {number} windowMs window size in milliseconds
 * @returns {boolean} true if the request is allowed, false if rate-limited
 */
export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  cleanup(now);

  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  buckets.set(key, hits);

  return hits.length <= limit;
}

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // SECURITY: `X-Forwarded-For` is a comma-separated chain where each proxy
    // *appends* the address it saw. A remote client can therefore pre-seed the
    // header with a forged value — but that forgery always lands on the LEFT.
    // Our own reverse proxy (Apache/Plesk) appends the true peer IP on the
    // RIGHT, so the trustworthy entry is the Nth-from-the-right, where N =
    // number of proxy hops we control in front of the app.
    //
    // Default N=1 (single Apache hop). If Plesk fronts Apache with nginx too,
    // set TRUSTED_PROXY_HOPS=2 so rate-limit buckets key on the real client IP
    // instead of the internal proxy IP. Taking the rightmost value is never
    // spoofable; the only cost of an under-count is coarser (not weaker) limits.
    const hops = Math.max(parseInt(process.env.TRUSTED_PROXY_HOPS || "1", 10) || 1, 1);
    const parts = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) {
      const ip = parts[parts.length - hops] ?? parts[0];
      if (ip) return ip;
    }
  }
  return request.headers.get("x-real-ip") || "unknown";
}
