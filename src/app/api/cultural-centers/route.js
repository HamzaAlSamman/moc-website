import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const centers = await prisma.culturalCenter.findMany({
    orderBy: [{ governorate: "asc" }, { nameAr: "asc" }],
  });

  // Group by governorate for easier frontend consumption
  const grouped = {};
  for (const c of centers) {
    if (!grouped[c.governorate]) grouped[c.governorate] = [];
    grouped[c.governorate].push({ id: c.id, nameAr: c.nameAr });
  }

  return NextResponse.json({ centers, grouped });
}
