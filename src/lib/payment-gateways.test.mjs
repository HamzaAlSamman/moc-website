import assert from "node:assert/strict";
import test from "node:test";

import {
  PAYMENT_GATEWAYS,
  PAYMENT_GATEWAY_IDS,
  isPaymentGatewayActive,
  isRedirectPaymentGateway,
  paymentGatewayName,
} from "./payment-gateways.mjs";

test("every gateway declares the fields both the card and the API rely on", () => {
  assert.ok(PAYMENT_GATEWAY_IDS.length >= 4);
  for (const id of PAYMENT_GATEWAY_IDS) {
    const gateway = PAYMENT_GATEWAYS[id];
    assert.ok(["active", "soon"].includes(gateway.status), `${id} has an unknown status`);
    assert.ok(gateway.nameAr && gateway.nameEn, `${id} is missing a name`);
    assert.ok(gateway.descAr && gateway.descEn, `${id} is missing a description`);
    assert.ok(gateway.logo, `${id} is missing a logo`);
    assert.match(gateway.theme.accent, /^#[0-9a-f]{6}$/i, `${id} has no accent colour`);
    assert.equal(gateway.theme.gradient.length, 3, `${id} needs three gradient stops`);
  }
});

test("each gateway has its own accent colour", () => {
  const accents = PAYMENT_GATEWAY_IDS.map((id) => PAYMENT_GATEWAYS[id].theme.accent.toLowerCase());
  assert.equal(new Set(accents).size, accents.length, "two gateways share a colour");
});

test("only live gateways are active, and unknown ids never are", () => {
  assert.equal(isPaymentGatewayActive("cham_cash"), true);
  assert.equal(isPaymentGatewayActive("syriatel_cash"), false);
  assert.equal(isPaymentGatewayActive("mtn_cash"), false);
  assert.equal(isPaymentGatewayActive("paymearia"), true);

  // The API feeds request data straight into this check, so anything that is
  // not a known live gateway must come back false rather than throw.
  for (const value of ["", "  ", "unknown_wallet", null, undefined, 0, {}, []]) {
    assert.equal(isPaymentGatewayActive(value), false, `${JSON.stringify(value)} must not be active`);
  }
});

test("exactly the manual-transfer and redirect gateways are live today", () => {
  const active = PAYMENT_GATEWAY_IDS.filter(isPaymentGatewayActive);
  assert.deepEqual(active, ["cham_cash", "paymearia"]);
});

test("only Paymera is a redirect gateway", () => {
  assert.equal(isRedirectPaymentGateway("paymearia"), true);
  assert.equal(isRedirectPaymentGateway("cham_cash"), false);
  assert.equal(isRedirectPaymentGateway("unknown_wallet"), false);
});

test("names resolve in both languages and degrade to the id", () => {
  assert.equal(paymentGatewayName("cham_cash"), "شام كاش");
  assert.equal(paymentGatewayName("cham_cash", "en"), "Cham Cash");
  assert.equal(paymentGatewayName("nope"), "nope");
});

test("an active manual-transfer gateway ships an account code and payment instructions", () => {
  for (const id of PAYMENT_GATEWAY_IDS.filter(isPaymentGatewayActive).filter((id) => !isRedirectPaymentGateway(id))) {
    const gateway = PAYMENT_GATEWAYS[id];
    assert.ok(gateway.accountCode, `${id} is live but has no account code`);
    assert.ok(gateway.instructionsAr.length > 0, `${id} is live but has no instructions`);
    assert.ok(gateway.instructionsEn.length > 0, `${id} is live but has no English instructions`);
  }
});

test("an active redirect gateway ships redirect copy instead of an account code", () => {
  for (const id of PAYMENT_GATEWAY_IDS.filter(isRedirectPaymentGateway)) {
    const gateway = PAYMENT_GATEWAYS[id];
    assert.ok(isPaymentGatewayActive(id), `${id} is a redirect gateway but not active`);
    assert.ok(gateway.redirectDescAr && gateway.redirectDescEn, `${id} is missing redirect copy`);
    assert.ok(!gateway.accountCode, `${id} is a redirect gateway but still has an account code`);
  }
});
