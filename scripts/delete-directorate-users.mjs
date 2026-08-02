import { PrismaClient } from "@prisma/client";
import {
  DIRECTORATE_USER_ROLE,
  DIRECTORATE_USERS,
} from "./directorate-users-data.mjs";

// Deletes every directorate account listed in directorate-users-data.mjs.
// Matches by the emails in that dataset (only DIRECTORATE-role accounts), so
// accounts with other roles are never touched. Post.author is the one hard FK
// to User — an account that authored posts is skipped (not deleted) so content
// is never orphaned; those must be reassigned/deleted by hand first.
//
// Run with `--dry-run` first to preview without deleting anything.

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const emails = DIRECTORATE_USERS.map((u) => u.email);

  const accounts = await prisma.user.findMany({
    where: { email: { in: emails }, role: DIRECTORATE_USER_ROLE },
    select: { id: true, email: true, nameAr: true },
  });

  if (accounts.length === 0) {
    console.log("No directorate accounts from the dataset found. Nothing to delete.");
    return;
  }

  // Flag any account that authored posts (blocks deletion of that one).
  const withPosts = new Map();
  for (const u of accounts) {
    const postCount = await prisma.post.count({ where: { authorId: u.id } });
    if (postCount > 0) withPosts.set(u.id, postCount);
  }

  if (dryRun) {
    console.log(`[dry-run] Found ${accounts.length} directorate account(s) from the dataset:`);
    for (const u of accounts) {
      const posts = withPosts.get(u.id);
      const note = posts ? `  ⚠ SKIP — authored ${posts} post(s)` : "";
      console.log(`  delete  ${u.email} | ${u.nameAr}${note}`);
    }
    const deletable = accounts.length - withPosts.size;
    console.log(`\n[dry-run] Would delete ${deletable}, skip ${withPosts.size}.`);
    return;
  }

  let deleted = 0;
  let skipped = 0;
  for (const u of accounts) {
    if (withPosts.has(u.id)) {
      console.warn(`skipped  ${u.email} — authored ${withPosts.get(u.id)} post(s); reassign or delete manually`);
      skipped += 1;
      continue;
    }
    await prisma.notification.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
    deleted += 1;
    console.log(`deleted  ${u.email}`);
  }

  console.log(`\nDone. Deleted ${deleted}, skipped ${skipped}.`);
}

main()
  .catch((error) => {
    console.error("Failed to delete directorate users:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
