import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const kinds = await prisma.eventKind.findMany({
      orderBy: { nameAr: "asc" },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        color: true,
      },
    });
    return NextResponse.json(kinds);
  } catch (err) {
    console.error("Fetch event kinds error:", err);
    return NextResponse.json({ error: "Failed to fetch event kinds" }, { status: 500 });
  }
}
