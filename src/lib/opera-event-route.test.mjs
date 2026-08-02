import assert from "node:assert/strict";
import { test } from "node:test";
import { createOperaEventHandlers } from "./opera-event-route.mjs";

const payload = {
  externalId: "opera-event-1",
  titleAr: "حفل",
  startDate: "2026-08-20T18:00:00.000Z",
  status: "UPCOMING",
};

function setup({ limited = false } = {}) {
  const calls = [];
  const prisma = {
    event: {
      async upsert(args) {
        calls.push(["upsert", args]);
        return { id: "moc-event-1" };
      },
      async updateMany(args) {
        calls.push(["updateMany", args]);
        return { count: 1 };
      },
    },
  };
  const handlers = createOperaEventHandlers({
    prisma,
    rateLimit: () => !limited,
    getClientIp: () => "127.0.0.1",
    getSecret: () => "shared-secret",
    now: () => new Date("2026-07-19T09:00:00.000Z"),
  });
  return { ...handlers, calls };
}

test("Opera route rate-limits before checking bearer authorization", async () => {
  const { POST } = setup({ limited: true });
  const response = await POST(new Request("https://moc.gov.sy/api/integrations/opera/events", {
    method: "POST",
  }));
  assert.equal(response.status, 429);
});

test("Opera route rejects invalid authorization and payloads", async () => {
  const { POST } = setup();
  const unauthorized = await POST(new Request("https://moc.gov.sy/api/integrations/opera/events", {
    method: "POST",
  }));
  assert.equal(unauthorized.status, 401);

  const invalid = await POST(new Request("https://moc.gov.sy/api/integrations/opera/events", {
    method: "POST",
    headers: { authorization: "Bearer shared-secret", "content-type": "application/json" },
    body: JSON.stringify({}),
  }));
  assert.equal(invalid.status, 400);
});

test("Opera POST upserts by source and external id without review status in updates", async () => {
  const { POST, calls } = setup();
  const response = await POST(new Request("https://moc.gov.sy/api/integrations/opera/events", {
    method: "POST",
    headers: { authorization: "Bearer shared-secret", "content-type": "application/json" },
    body: JSON.stringify(payload),
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(calls[0][1].where, {
    source_externalId: { source: "OPERA", externalId: "opera-event-1" },
  });
  assert.equal(calls[0][1].create.reviewStatus, "APPROVED");
  assert.equal("reviewStatus" in calls[0][1].update, false);
});

test("Opera DELETE soft-cancels only the matching Opera event", async () => {
  const { DELETE, calls } = setup();
  const response = await DELETE(new Request(
    "https://moc.gov.sy/api/integrations/opera/events?externalId=opera-event-1",
    { method: "DELETE", headers: { authorization: "Bearer shared-secret" } },
  ));

  assert.equal(response.status, 200);
  assert.deepEqual(calls[0][1].where, {
    source: "OPERA",
    externalId: "opera-event-1",
  });
  assert.equal(calls[0][1].data.status, "CANCELLED");
});
