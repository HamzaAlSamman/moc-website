import { NextResponse } from "next/server";

import { getCitizenSession } from "@/lib/citizen-session";
import { requireCitizenAuthOrigin } from "@/lib/citizen-auth-route";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { cancelBooking } from "@/lib/event-booking-service";
import { citizenBookingError, citizenBookingPayload } from "@/lib/event-booking-route.mjs";

export const dynamic = "force-dynamic";

function json(body, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request, { params }) {
  const originError = requireCitizenAuthOrigin(request);
  if (originError) return originError;
  const session = await getCitizenSession();
  if (!session?.citizenId) return json({ error: "يلزم تسجيل الدخول", code: "AUTH_REQUIRED" }, 401);
  const ip = getClientIp(request);
  if (
    !rateLimit(`citizen-booking-cancel:ip:${ip}`, 120, 60 * 60 * 1000)
    || !rateLimit(`citizen-booking-cancel:citizen:${session.citizenId}`, 30, 60 * 60 * 1000)
  ) return json({ error: "محاولات كثيرة، يرجى المحاولة لاحقاً" }, 429);

  const { id } = await params;
  try {
    const booking = await cancelBooking({ bookingId: id, citizenId: session.citizenId });
    return json({ booking: citizenBookingPayload(booking) });
  } catch (error) {
    const response = citizenBookingError(error);
    return json(response.body, response.status);
  }
}
