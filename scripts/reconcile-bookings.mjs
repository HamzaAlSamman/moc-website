const args = new Set(process.argv.slice(2));
const repair = args.has("--apply");
const confirmed = args.has("--confirm-booking-counter-repair");
const eventArg = process.argv.find((value) => value.startsWith("--event="));
const eventId = eventArg ? eventArg.slice("--event=".length).trim() : null;

if (repair && !confirmed) {
  console.error("Refusing to repair counters without --confirm-booking-counter-repair");
  process.exitCode = 64;
} else {
  const [{ reconcileBookedCount }, { prisma }] = await Promise.all([
    import("../src/lib/event-booking-service.js"),
    import("../src/lib/prisma.js"),
  ]);
  try {
    const result = await reconcileBookedCount({ eventId: eventId || null, apply: repair });
    console.log(JSON.stringify({ mode: repair ? "repair" : "report", ...result }, null, 2));
    if (!repair && result.drifts.length) process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}
