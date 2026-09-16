import "server-only";

// Server-side client for Paymera eGate v4.0 — see the vendor docs at
// بايميرا/paymera-egate-integration-guide.md and
// بايميرا/Paymera eGate specifications v4.0.pdf.
//
// Authentication must never reach the browser or a mobile app (per the
// spec's §4): every call here runs on the server, using an API key that
// carries no client-configurable prefix (unlike the other gateways in
// payment-gateways.mjs, which only ever handle a public account number).

const DEFAULT_BASE_URL = "https://egate-t.paymera.cc";

function paymeraConfig() {
  const apiKey = process.env.PAYMERA_API_KEY;
  const terminalId = process.env.PAYMERA_TERMINAL_ID;
  const missing = [];
  if (!apiKey) missing.push("PAYMERA_API_KEY");
  if (!terminalId) missing.push("PAYMERA_TERMINAL_ID");
  if (missing.length) {
    throw Object.assign(
      new Error(`Paymera is not configured: missing ${missing.join(", ")}`),
      { code: "PAYMERA_CONFIG_MISSING" },
    );
  }
  return { baseUrl: process.env.PAYMERA_BASE_URL || DEFAULT_BASE_URL, apiKey, terminalId };
}

function authHeader(apiKey) {
  // Basic Auth with the API key as username and an empty password — the
  // trailing colon before base64-encoding is required by the spec.
  return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
}

// Password-reset links use this same three-var fallback chain (see
// trustedBaseUrl in citizen-auth-core.mjs) — never trust the request Host
// header for a URL handed to a third party (here, Paymera's redirect/trigger
// targets).
export function appBaseUrl() {
  const raw = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) {
    throw Object.assign(
      new Error("APP_BASE_URL is required for Paymera callback/trigger URLs"),
      { code: "APP_BASE_URL_MISSING" },
    );
  }
  return new URL(raw).origin;
}

async function paymeraRequest(path, { method = "GET", body } = {}) {
  const { baseUrl, apiKey } = paymeraConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader(apiKey),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const rawBody = await response.text();
  let data = null;
  try { data = JSON.parse(rawBody); } catch { /* non-JSON handled below */ }
  if (!data || data.ErrorCode !== 0) {
    // A real Paymera rejection is JSON carrying ErrorMessage/ErrorCode. An
    // HTML body is Cloudflare in front of the gateway refusing the request
    // outright — most often because the callback/trigger URLs built from
    // APP_BASE_URL point at localhost, which trips its SSRF rules. Logging
    // the raw status and a snippet is the only way to tell the two apart.
    console.error("Paymera request failed", {
      path, status: response.status, body: rawBody.slice(0, 500),
    });
    throw Object.assign(
      new Error(data?.ErrorMessage || `Paymera request to ${path} failed with HTTP ${response.status}`),
      { code: "PAYMERA_REQUEST_FAILED", errorCode: data?.ErrorCode, httpStatus: response.status },
    );
  }
  return data.Data;
}

/**
 * Starts a Paymera eGate payment session for one copyright fee stage.
 * `submissionId` and `stage` are threaded through as query params on the
 * trigger/callback URLs so those endpoints — which only receive whatever
 * Paymera calls them with — know which fee this session is for.
 *
 * @param {{ amount: number, submissionId: string, stage: "initial"|"final", lang?: "ar"|"en" }} params
 * @returns {Promise<{ paymentId: string, paymentUrl: string }>}
 */
export async function createPaymeraPayment({ amount, submissionId, stage, lang = "ar" }) {
  const { terminalId } = paymeraConfig();
  const base = appBaseUrl();
  const query = `submissionId=${encodeURIComponent(submissionId)}&stage=${encodeURIComponent(stage)}&locale=${encodeURIComponent(lang)}`;
  const data = await paymeraRequest("/api/create-payment", {
    method: "POST",
    body: {
      lang,
      terminalId,
      amount,
      callbackURL: `${base}/api/copyright/payment/paymera/callback?${query}`,
      triggerURL: `${base}/api/copyright/payment/paymera/trigger?${query}`,
      notes: `${submissionId}:${stage}`,
    },
  });
  return { paymentId: data.paymentId, paymentUrl: data.url };
}

/**
 * The authoritative outcome of a payment session. Never trust callbackURL or
 * triggerURL being called on their own — always confirm through this call.
 *
 * @param {string} paymentId
 * @returns {Promise<{ status: "P"|"A"|"F"|"C", amount: number, notes: string, rrn: string }>}
 */
export async function getPaymeraPaymentStatus(paymentId) {
  return paymeraRequest(`/api/get-payment-status/${encodeURIComponent(paymentId)}`);
}
