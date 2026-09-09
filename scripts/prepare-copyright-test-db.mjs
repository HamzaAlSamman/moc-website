import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import { spawnSync } from "node:child_process";

nextEnv.loadEnvConfig(process.cwd());
const source = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1", "::1"].includes(source.hostname)) {
  throw new Error("Copyright tests require a local PostgreSQL host");
}
const databaseName = "moc_copyright_audit_test";
const adminUrl = new URL(source);
adminUrl.pathname = "/postgres";
const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
try {
  const found = await admin.$queryRaw`SELECT 1 FROM pg_database WHERE datname = ${databaseName}`;
  if (!found.length) await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
} finally {
  await admin.$disconnect();
}
source.pathname = `/${databaseName}`;
const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: source.toString() },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
