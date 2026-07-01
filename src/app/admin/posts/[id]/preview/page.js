import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PreviewClient from "./PreviewClient";

export default async function PostPreviewPage({ params }) {
  await verifySession(); // must be logged in
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where:   { id },
    include: { author: { select: { nameAr: true, nameEn: true } }, category: { select: { nameAr: true, nameEn: true } } },
  });

  if (!post) notFound();

  return <PreviewClient post={JSON.parse(JSON.stringify(post))} />;
}
