import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.eventCategory.findMany({ orderBy: { nameAr: "asc" } });
  return NextResponse.json(categories);
}
