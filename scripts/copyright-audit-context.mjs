import nextEnv from "@next/env";
import { registerHooks } from "node:module";
import nodemailer from "nodemailer";
import { existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

nextEnv.loadEnvConfig(process.cwd());
const url = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) throw new Error("Local database required");
url.pathname = "/moc_copyright_audit_test";
process.env.DATABASE_URL = url.toString();
process.env.SMTP_HOST = "127.0.0.1";
process.env.SMTP_USER = "copyright-audit";
process.env.SMTP_PASS = "local-test-only";
process.env.APP_BASE_URL = "http://127.0.0.1:3017";
process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3017";

export const capturedEmails = [];
nodemailer.createTransport = () => ({
  async sendMail(message) {
    capturedEmails.push(message);
    return { messageId: "local-copyright-audit" };
  },
});
nodemailer.createTestAccount = () => { throw new Error("External email is forbidden in the audit"); };
globalThis.copyrightAuditSession = null;
globalThis.copyrightAuditPdfCalls = [];
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier === "@/lib/dal") return {
      url: "data:text/javascript," + encodeURIComponent("export async function verifySession() { if (!globalThis.copyrightAuditSession) throw new Error('Unauthorized audit session'); return globalThis.copyrightAuditSession; }"),
      shortCircuit: true,
    };
    if (specifier === "@/lib/receipt-pdf") return {
      url: "data:text/javascript," + encodeURIComponent("export async function generateReceiptPdf(submission, options) { globalThis.copyrightAuditPdfCalls.push({submission, options}); return Buffer.from('%PDF-1.4 audit transport stub'); }"),
      shortCircuit: true,
    };
    if (specifier.startsWith("@/")) {
      let path = resolve(process.cwd(), "src", specifier.slice(2));
      if (!extname(path) && existsSync(`${path}.js`)) path += ".js";
      return nextResolve(pathToFileURL(path).href, context);
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:") && !context.parentURL.includes("/node_modules/")) {
      const path = fileURLToPath(new URL(specifier, context.parentURL));
      if (!extname(path) && existsSync(`${path}.js`)) return nextResolve(pathToFileURL(`${path}.js`).href, context);
    }
    return nextResolve(specifier, context);
  },
});
