// Isolated local Next.js + SMTP sink. Never sends any message off this machine.
import nextEnv from "@next/env";
import net from "node:net";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
nextEnv.loadEnvConfig(process.cwd());
const db = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1", "::1"].includes(db.hostname)) throw new Error("Local DB required");
db.pathname = "/moc_copyright_audit_test";
mkdirSync("tmp/copyright-audit", { recursive: true });
let count = 0;
const smtp = net.createServer((socket) => {
  socket.setEncoding("utf8");
  socket.write("220 localhost copyright audit SMTP sink\r\n");
  let buffer = "", dataMode = false, message = [];
  socket.on("error", () => {});
  socket.on("data", chunk => {
    buffer += chunk;
    while (buffer.includes("\r\n")) {
      const end = buffer.indexOf("\r\n"), line = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      if (dataMode) {
        if (line === ".") {
          writeFileSync(`tmp/copyright-audit/mail-${++count}.eml`, message.join("\r\n"));
          message = []; dataMode = false;
          socket.write("250 Message captured locally\r\n");
          console.log(`Captured local audit email ${count}`);
        } else message.push(line);
      } else if (/^EHLO|^HELO/i.test(line)) socket.write("250-localhost\r\n250 AUTH PLAIN\r\n");
      else if (/^AUTH/i.test(line)) socket.write("235 Authentication accepted for local test\r\n");
      else if (/^DATA/i.test(line)) { dataMode = true; socket.write("354 End with dot\r\n"); }
      else if (/^QUIT/i.test(line)) socket.end("221 Bye\r\n");
      else socket.write("250 OK\r\n");
    }
  });
});
await new Promise((resolve, reject) => { smtp.once("error", reject); smtp.listen(2526, "127.0.0.1", resolve); });
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3017"], {
  stdio: "inherit", windowsHide: true,
  env: { ...process.env, DATABASE_URL: db.toString(), SMTP_HOST: "127.0.0.1", SMTP_PORT: "2526",
    SMTP_USER: "audit", SMTP_PASS: "audit-local-only", SMTP_FROM: "audit@example.invalid",
    APP_BASE_URL: "http://127.0.0.1:3017", NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3017" },
});
child.once("exit", code => { smtp.close(); process.exitCode = code ?? 0; });
process.on("SIGINT", () => { child.kill(); smtp.close(); });
