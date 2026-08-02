import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PreviewClient from "./PreviewClient";
import { can } from "@/lib/permissions";

export default async function PostPreviewPage({ params }) {
  const session = await verifySession();
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where:   { id },
    include: { author: { select: { nameAr: true, nameEn: true } }, category: { select: { nameAr: true, nameEn: true } } },
  });

  if (!post || (!can(session.role, "VIEW_ANY_POST") && post.authorId !== session.userId)) notFound();

  return <PreviewClient post={JSON.parse(JSON.stringify(post))} />;
}
