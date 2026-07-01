import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_DIRECTORATE_PASSWORD,
  DIRECTORATE_USER_ROLE,
  DIRECTORATE_USERS,
} from "./directorate-users-data.mjs";

test("directorate user list contains valid unique accounts", () => {
  assert.equal(DIRECTORATE_USERS.length, 26);

  const emails = DIRECTORATE_USERS.map((user) => user.email);
  assert.equal(new Set(emails).size, emails.length);

  for (const user of DIRECTORATE_USERS) {
    assert.match(user.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    assert.equal(Boolean(user.nameAr?.trim()), true);
  }
});

test("directorate users use the directorate role and a strong temporary password", () => {
  assert.equal(DIRECTORATE_USER_ROLE, "DIRECTORATE");
  assert.match(DEFAULT_DIRECTORATE_PASSWORD, /[A-Z]/);
  assert.match(DEFAULT_DIRECTORATE_PASSWORD, /[a-z]/);
  assert.match(DEFAULT_DIRECTORATE_PASSWORD, /[0-9]/);
  assert.match(DEFAULT_DIRECTORATE_PASSWORD, /[^A-Za-z0-9]/);
  assert.equal(DEFAULT_DIRECTORATE_PASSWORD.length >= 12, true);
});
