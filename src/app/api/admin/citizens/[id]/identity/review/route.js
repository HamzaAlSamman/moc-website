import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { verifyTrustedOrigin } from "@/lib/csrf";
import { getClientIp } from "@/lib/rate-limit";
import { citizenIdentityReviewService, CitizenIdentityReviewError } from "@/lib/citizen-identity-review";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const actor = await getCurrentUser();
  if (!can(actor.role, "REVIEW_CITIZEN_IDENTITY")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const citizen = await citizenIdentityReviewService.reviewIdentity({
      citizenId: id,
      actor: { id: actor.id, email: actor.email, role: actor.role },
      action: body.action,
      reason: body.reason,
      ipAddress: getClientIp(request),
    });
    return NextResponse.json({ citizen }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof CitizenIdentityReviewError) {
      const status = error.code === "CITIZEN_NOT_FOUND" ? 404
        : error.code === "REJECTION_REASON_REQUIRED" || error.code === "INVALID_REVIEW_ACTION" ? 400
          : 409;
      return NextResponse.json({ error: error.code }, { status });
    }
    throw error;
  }
}
