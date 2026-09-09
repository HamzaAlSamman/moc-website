import assert from "node:assert/strict";
import test from "node:test";

import { Prisma } from "@prisma/client";

test("generated Prisma Client includes the current copyright submission fields", () => {
  const model = Prisma.dmmf.datamodel.models.find(
    ({ name }) => name === "CopyrightSubmission",
  );
  assert.ok(model, "CopyrightSubmission must exist in the generated Prisma Client");

  const generatedFields = new Set(model.fields.map(({ name }) => name));
  for (const field of [
    "referenceNo",
    "workDriveUrl",
    "workOrigin",
    "originalWorkName",
    "originalPermission",
  ]) {
    assert.ok(generatedFields.has(field), `generated Prisma Client is missing ${field}`);
  }
});
