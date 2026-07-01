const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
(async () => {
  const password = await bcrypt.hash("Moc@123456", 12);
  const u = await prisma.user.upsert({
    where: { email: "test-em@moc.gov.sy" },
    update: { role: "EVENT_MANAGER", isActive: true, password },
    create: { email: "test-em@moc.gov.sy", password, nameAr: "اختبار مدير فعاليات", role: "EVENT_MANAGER", isActive: true },
  });
  console.log(JSON.stringify({ id: u.id, email: u.email }));
})().finally(() => prisma.$disconnect());
