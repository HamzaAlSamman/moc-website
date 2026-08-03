import { PrismaClient } from "@prisma/client";

const TEST_DATABASE_NAME = "moc_cms_booking_test";
const source = new URL(process.env.DATABASE_URL || "");
if (!['localhost', '127.0.0.1', '::1'].includes(source.hostname)) {
  throw new Error("Refusing to create a booking test database on a non-local host");
}
if (!TEST_DATABASE_NAME.endsWith("_test")) {
  throw new Error("Test database name must end with _test");
}

const adminUrl = new URL(source);
adminUrl.pathname = "/postgres";
const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });

try {
  const existing = await admin.$queryRawUnsafe(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    TEST_DATABASE_NAME,
  );
  if (existing.length === 0) {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${TEST_DATABASE_NAME}"`);
    console.log(`Created local database ${TEST_DATABASE_NAME}`);
  } else {
    console.log(`Local database ${TEST_DATABASE_NAME} already exists`);
  }
} finally {
  await admin.$disconnect();
}
