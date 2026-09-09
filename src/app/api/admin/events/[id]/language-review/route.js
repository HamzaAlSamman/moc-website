import { NextResponse } from "next/server";

import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { verifyTrustedOrigin } from "@/lib/csrf";
import { missingEnglishFields } from "@/lib/event-language-review.mjs";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "REVIEW_EVENT_LANGUAGE")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reviewed = body.reviewed !== false;

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, titleEn: true, descriptionEn: true, locationEn: true },
  });
  if (!event) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  // An event cannot be signed off while its English is still missing — the tick
  // would claim a translation was read that does not exist.
  const gaps = missingEnglishFields(event);
  if (reviewed && gaps.length) {
    return NextResponse.json(
      { error: `لا يمكن اعتماد التدقيق والترجمة ناقصة: ${gaps.join("، ")}`, code: "ENGLISH_INCOMPLETE", missing: gaps },
      { status: 409 },
    );
  }

  const updated = await prisma.event.update({
    where: { id },
    data: reviewed
      ? { languageReviewedAt: new Date(), languageReviewedById: session.userId }
      : { languageReviewedAt: null, languageReviewedById: null },
    select: { id: true, languageReviewedAt: true, languageReviewedById: true },
  });

  return NextResponse.json(updated, { headers: { "Cache-Control": "no-store" } });
}
