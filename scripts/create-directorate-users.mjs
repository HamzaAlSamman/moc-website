import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_DIRECTORATE_PASSWORD,
  DIRECTORATE_USER_ROLE,
  DIRECTORATE_USERS,
} from "./directorate-users-data.mjs";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");
const temporaryPassword = process.env.DIRECTORATE_USER_PASSWORD || DEFAULT_DIRECTORATE_PASSWORD;

async function main() {
  console.log(`${dryRun ? "[dry-run] " : ""}Preparing ${DIRECTORATE_USERS.length} directorate users...`);

  if (dryRun) {
    for (const user of DIRECTORATE_USERS) {
      console.log(`- ${user.email} | ${user.nameAr} | role=${DIRECTORATE_USER_ROLE}`);
    }
    return;
  }

  const password = await bcrypt.hash(temporaryPassword, 12);
  let created = 0;
  let updated = 0;

  for (const user of DIRECTORATE_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });

    if (existing) {
      await prisma.user.update({
        where: { email: user.email },
        data: {
          nameAr: user.nameAr,
          role: DIRECTORATE_USER_ROLE,
          isActive: true,
        },
      });
      updated += 1;
      console.log(`updated  ${user.email}`);
      continue;
    }

    await prisma.user.create({
      data: {
        email: user.email,
        password,
        nameAr: user.nameAr,
        nameEn: null,
        role: DIRECTORATE_USER_ROLE,
        isActive: true,
        mustChangePassword: true,
      },
    });
    created += 1;
    console.log(`created  ${user.email}`);
  }

  console.log(`\nDone. Created ${created}, updated ${updated}.`);
  console.log(`Temporary password for newly-created users: ${temporaryPassword}`);
  console.log("Existing users kept their current password.");
}

main()
  .catch((error) => {
    console.error("Failed to create directorate users:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
