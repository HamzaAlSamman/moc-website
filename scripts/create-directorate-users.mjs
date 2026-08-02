import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_DIRECTORATE_PASSWORD,
  DIRECTORATE_USER_ROLE,
  DIRECTORATE_USERS,
} from "./directorate-users-data.mjs";

// Syncs the DIRECTORATE-role accounts to exactly the list in
// directorate-users-data.mjs. Every account ends up on the SAME unified
// password and flagged `mustChangePassword: true`, so each directorate is
// forced to set its own password the first time it logs in (enforced at the
// edge by proxy.js). Accounts with other roles are never touched.
//
// Modes:
//   (default)  in-place: upsert the 26 wanted accounts, then delete any
//              leftover DIRECTORATE account not in the list. Existing wanted
//              accounts keep their id (password + flag are reset).
//   --fresh    clean slate: DELETE every DIRECTORATE account first, then
//              create all 26 brand new (new ids). Aborts if any existing
//              directorate authored posts, so content is never orphaned.
//   --dry-run  preview only, writes nothing.

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");
const fresh = process.argv.includes("--fresh");
const unifiedPassword = process.env.DIRECTORATE_USER_PASSWORD || DEFAULT_DIRECTORATE_PASSWORD;

async function main() {
  const wantedEmails = new Set(DIRECTORATE_USERS.map((u) => u.email));

  const existingDirectorates = await prisma.user.findMany({
    where: { role: DIRECTORATE_USER_ROLE },
    select: { id: true, email: true, nameAr: true },
  });

  // Post.author is the one hard FK to User — deleting an author would orphan
  // content, so find any directorate that authored posts up front.
  const postOwners = [];
  for (const u of existingDirectorates) {
    const postCount = await prisma.post.count({ where: { authorId: u.id } });
    if (postCount > 0) postOwners.push({ ...u, postCount });
  }

  if (dryRun) {
    if (fresh) {
      console.log(`[dry-run] --fresh: would DELETE all ${existingDirectorates.length} existing directorate account(s):`);
      for (const u of existingDirectorates) console.log(`  delete  ${u.email} | ${u.nameAr}`);
      console.log(`\n[dry-run] then CREATE ${DIRECTORATE_USERS.length} fresh account(s):`);
      for (const u of DIRECTORATE_USERS) console.log(`  create  ${u.email} | ${u.nameAr}`);
      if (postOwners.length) {
        console.log(`\n[dry-run] ⚠ WOULD ABORT — these authored posts (reassign/delete first):`);
        for (const u of postOwners) console.log(`  ${u.email} — ${u.postCount} post(s)`);
      }
    } else {
      const toRemove = existingDirectorates.filter((u) => !wantedEmails.has(u.email));
      console.log(`[dry-run] would sync ${DIRECTORATE_USERS.length} account(s) (unified password + force-change):`);
      for (const u of DIRECTORATE_USERS) console.log(`  upsert  ${u.email} | ${u.nameAr}`);
      console.log(`\n[dry-run] would remove ${toRemove.length} old directorate account(s):`);
      for (const u of toRemove) console.log(`  remove  ${u.email} | ${u.nameAr}`);
    }
    console.log(`\n[dry-run] unified password would be: ${unifiedPassword}`);
    return;
  }

  const password = await bcrypt.hash(unifiedPassword, 12);

  // --- --fresh: wipe every directorate account, then create all 26 new. ------
  if (fresh) {
    if (postOwners.length) {
      console.error("Aborting --fresh: these directorate accounts authored posts (would orphan content):");
      for (const u of postOwners) console.error(`  ${u.email} — ${u.postCount} post(s)`);
      console.error("Reassign/delete those posts first, or run without --fresh (in-place reset keeps their id).");
      process.exitCode = 1;
      return;
    }

    const ids = existingDirectorates.map((u) => u.id);
    if (ids.length) {
      await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    }
    const wiped = await prisma.user.deleteMany({ where: { role: DIRECTORATE_USER_ROLE } });
    console.log(`Wiped ${wiped.count} existing directorate account(s).`);

    let created = 0;
    for (const user of DIRECTORATE_USERS) {
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

    console.log(`\nDone (fresh). Wiped ${wiped.count}, created ${created}.`);
    console.log(`Unified password for ALL directorate accounts: ${unifiedPassword}`);
    console.log("Every account must set its own new password on first login.");
    return;
  }

  // --- default: in-place upsert + remove leftovers. --------------------------
  let created = 0;
  let reset = 0;
  for (const user of DIRECTORATE_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (existing) {
      await prisma.user.update({
        where: { email: user.email },
        data: {
          nameAr: user.nameAr,
          role: DIRECTORATE_USER_ROLE,
          isActive: true,
          password,
          mustChangePassword: true,
        },
      });
      reset += 1;
      console.log(`reset    ${user.email}`);
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

  let removed = 0;
  let skipped = 0;
  const toRemove = existingDirectorates.filter((u) => !wantedEmails.has(u.email));
  for (const u of toRemove) {
    if (postOwners.some((p) => p.id === u.id)) {
      console.warn(`skipped  ${u.email} — authored posts; reassign or delete manually`);
      skipped += 1;
      continue;
    }
    await prisma.notification.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
    removed += 1;
    console.log(`removed  ${u.email}`);
  }

  console.log(`\nDone. Created ${created}, reset ${reset}, removed ${removed}, skipped ${skipped}.`);
  console.log(`Unified password for ALL directorate accounts: ${unifiedPassword}`);
  console.log("Every account must set its own new password on first login.");
}

main()
  .catch((error) => {
    console.error("Failed to sync directorate users:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
