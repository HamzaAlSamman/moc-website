import {
  isOperaBearerAuthorized,
  OperaSyncValidationError,
  parseOperaEventPayload,
  parseOperaExternalId,
} from "./opera-event-sync.mjs";

const json = (body, status) => Response.json(body, { status });

export function createOperaEventHandlers({
  prisma,
  rateLimit,
  getClientIp,
  getSecret,
  now = () => new Date(),
}) {
  function isRateLimited(request) {
    return !rateLimit("opera-sync:" + getClientIp(request), 60, 60 * 1000);
  }

  function isAuthorized(request) {
    return isOperaBearerAuthorized(
      request.headers.get("authorization"),
      getSecret(),
    );
  }

  function validationResponse(error) {
    return json(
      { error: error.message, ...(error.details ? { details: error.details } : {}) },
      400,
    );
  }

  async function POST(request) {
    if (isRateLimited(request)) return json({ error: "Too many requests" }, 429);
    if (!isAuthorized(request)) return json({ error: "Unauthorized" }, 401);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    let data;
    try {
      data = parseOperaEventPayload(body, now());
    } catch (error) {
      if (error instanceof OperaSyncValidationError) return validationResponse(error);
      throw error;
    }

    try {
      const event = await prisma.event.upsert({
        where: {
          source_externalId: { source: "OPERA", externalId: data.externalId },
        },
        create: data.create,
        update: data.update,
      });
      return json({ ok: true, id: event.id }, 200);
    } catch (error) {
      console.error("Opera event sync (POST) failed:", error);
      return json({ error: "Sync failed" }, 500);
    }
  }

  async function DELETE(request) {
    if (isRateLimited(request)) return json({ error: "Too many requests" }, 429);
    if (!isAuthorized(request)) return json({ error: "Unauthorized" }, 401);

    let externalId;
    try {
      externalId = parseOperaExternalId(
        new URL(request.url).searchParams.get("externalId"),
      );
    } catch (error) {
      if (error instanceof OperaSyncValidationError) return validationResponse(error);
      throw error;
    }

    try {
      const result = await prisma.event.updateMany({
        where: { source: "OPERA", externalId },
        data: { status: "CANCELLED", syncedAt: now() },
      });
      if (result.count === 0) return json({ error: "Not found" }, 404);
      return json({ ok: true }, 200);
    } catch (error) {
      console.error("Opera event sync (DELETE) failed:", error);
      return json({ error: "Sync failed" }, 500);
    }
  }

  return { POST, DELETE };
}
