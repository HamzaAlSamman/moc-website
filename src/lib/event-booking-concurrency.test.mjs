import assert from "node:assert/strict";
import test from "node:test";

const testUrl = process.env.DATABASE_URL_TEST;
const guarded = (() => {
  if (!testUrl) return false;
  const parsed = new URL(testUrl);
  return ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)
    && parsed.pathname.replace(/^\//, "").endsWith("_test");
})();

test("PostgreSQL booking concurrency preserves capacity, uniqueness, promotion, and lock order", {
  skip: guarded ? false : "DATABASE_URL_TEST must point to a local database ending in _test",
  timeout: 120_000,
}, async () => {
  assert.equal(process.env.DATABASE_URL, testUrl, "service and test client must use the same guarded database");
  const [{ PrismaClient }, booking] = await Promise.all([
    import("@prisma/client"),
    import("./event-booking-service.js"),
  ]);
  const db = new PrismaClient();
  const run = `booking-concurrency-${Date.now()}`;
  const citizenIds = [];
  const eventIds = [];
  const recipients = [];

  function citizenData(index) {
    const email = `${run}-${index}@example.sy`;
    recipients.push(email);
    return {
      email,
      password: "not-used-in-service-test",
      fullName: `Citizen ${index}`,
      phone: `0999${String(index).padStart(6, "0")}`,
      nationalIdHash: `${run}-national-${index}`,
      nationalIdLast4: String(index).padStart(4, "0").slice(-4),
      emailVerifiedAt: new Date(),
      identityStatus: "VERIFIED",
      identityVerifiedAt: new Date(),
      isActive: true,
      isBlocked: false,
    };
  }

  async function makeCitizens(count, offset = 0) {
    const rows = [];
    for (let i = 0; i < count; i += 1) {
      const row = await db.citizen.create({ data: citizenData(offset + i) });
      citizenIds.push(row.id);
      rows.push(row);
    }
    return rows;
  }

  async function makeEvent(capacity) {
    const event = await db.event.create({
      data: {
        titleAr: run,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "UPCOMING",
        reviewStatus: "APPROVED",
        source: "MOC",
        bookingAvailability: "OPEN",
        capacity,
        bookedCount: 0,
        waitlistEnabled: true,
        bookingOpensAt: new Date(Date.now() - 60_000),
        bookingClosesAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    eventIds.push(event.id);
    return event;
  }

  async function assertInvariant(eventId) {
    const [event, confirmed, duplicateGroups] = await Promise.all([
      db.event.findUniqueOrThrow({ where: { id: eventId } }),
      db.eventBooking.count({ where: { eventId, status: "CONFIRMED" } }),
      db.$queryRaw`
        SELECT "nationalIdHash", COUNT(*)::int AS count
        FROM "EventBooking"
        WHERE "eventId" = ${eventId} AND "status" IN ('CONFIRMED', 'WAITLISTED')
        GROUP BY "nationalIdHash" HAVING COUNT(*) > 1
      `,
    ]);
    assert.equal(event.bookedCount, confirmed);
    assert.ok(confirmed <= event.capacity);
    assert.equal(duplicateGroups.length, 0);
  }

  try {
    const citizens = await makeCitizens(60);
    const event = await makeEvent(10);
    const fifty = await Promise.all(citizens.slice(0, 50).map((citizen) =>
      booking.createBooking({ eventId: event.id, citizenId: citizen.id })));
    assert.equal(fifty.filter((item) => item.status === "CONFIRMED").length, 10);
    assert.equal(fifty.filter((item) => item.status === "WAITLISTED").length, 40);
    await assertInvariant(event.id);

    const duplicateEvent = await makeEvent(5);
    const twenty = await Promise.all(Array.from({ length: 20 }, () =>
      booking.createBooking({ eventId: duplicateEvent.id, citizenId: citizens[50].id })));
    assert.equal(new Set(twenty.map((item) => item.id)).size, 1);
    assert.equal(await db.eventBooking.count({ where: { eventId: duplicateEvent.id } }), 1);
    await assertInvariant(duplicateEvent.id);

    const confirmed = await db.eventBooking.findFirstOrThrow({
      where: { eventId: event.id, status: "CONFIRMED" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const firstWaitlisted = await db.eventBooking.findFirstOrThrow({
      where: { eventId: event.id, status: "WAITLISTED" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const cancellations = await Promise.all([
      booking.cancelBooking({ bookingId: confirmed.id, citizenId: confirmed.citizenId }),
      booking.cancelBooking({ bookingId: confirmed.id, citizenId: confirmed.citizenId }),
    ]);
    assert.equal(cancellations.filter((item) => item.idempotent === false).length, 1);
    assert.equal((await db.eventBooking.findUniqueOrThrow({ where: { id: firstWaitlisted.id } })).status, "CONFIRMED");
    await assertInvariant(event.id);

    const mixedConfirmed = await db.eventBooking.findFirstOrThrow({
      where: { eventId: event.id, status: "CONFIRMED", id: { not: firstWaitlisted.id } },
    });
    await Promise.all([
      booking.createBooking({ eventId: event.id, citizenId: citizens[51].id }),
      booking.cancelBooking({ bookingId: mixedConfirmed.id, citizenId: mixedConfirmed.citizenId }),
    ]);
    await assertInvariant(event.id);

    const capacityConfirmed = await db.eventBooking.findFirstOrThrow({
      where: { eventId: event.id, status: "CONFIRMED" },
    });
    await Promise.all([
      booking.syncCapacity({ eventId: event.id, capacity: 12 }),
      booking.cancelBooking({ bookingId: capacityConfirmed.id, citizenId: capacityConfirmed.citizenId }),
    ]);
    await assertInvariant(event.id);
  } finally {
    await db.notificationOutbox.deleteMany({ where: { recipient: { in: recipients } } });
    await db.eventBooking.deleteMany({ where: { eventId: { in: eventIds } } });
    await db.event.deleteMany({ where: { id: { in: eventIds } } });
    await db.citizen.deleteMany({ where: { id: { in: citizenIds } } });
    await db.$disconnect();
  }
});
