import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// Shared temporary password (see proxy.js) gating the not-yet-public services:
// Copyright, International Cooperation, and Internal Oversight. One password
// unlocks all three. Override via SERVICES_GATE_PASSWORD without a code
// change (COPYRIGHT_GATE_PASSWORD is kept as a fallback for any deployment
// that already set it before this gate covered more than Copyright).
const GATE_PASSWORD = process.env.SERVICES_GATE_PASSWORD || process.env.COPYRIGHT_GATE_PASSWORD || "1234";
const GATE_COOKIE = "services-gate";

export async function POST(request) {
  const ip = getClientIp(request);
  if (!rateLimit(`services-gate:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "محاولات كثيرة جداً، يرجى المحاولة لاحقاً" }, { status: 429 });
  }

  const { password } = await request.json();

  if (password !== GATE_PASSWORD) {
    return NextResponse.json({ error: "كلمة السر غير صحيحة" }, { status: 401 });
  }

  const token = await encrypt({ gate: "restricted-services" });
  const res = NextResponse.json({ success: true });
  res.cookies.set(GATE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
