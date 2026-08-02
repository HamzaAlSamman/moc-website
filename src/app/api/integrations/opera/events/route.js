import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createOperaEventHandlers } from "@/lib/opera-event-route.mjs";

export const { POST, DELETE } = createOperaEventHandlers({
  prisma,
  rateLimit,
  getClientIp,
  getSecret: () => process.env.OPERA_SYNC_SECRET,
});
