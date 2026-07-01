import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

export async function GET() {
  await verifySession();
  const settings = await prisma.setting.findMany();
  return NextResponse.json(Object.fromEntries(settings.map((s) => [s.key, s.value])));
}

export async function POST(request) {
  const session = await verifySession();
  if (!can(session.role, "EDIT_SETTINGS")) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const data = await request.json();

  await Promise.all(
    Object.entries(data).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      })
    )
  );

  return NextResponse.json({ success: true });
}
