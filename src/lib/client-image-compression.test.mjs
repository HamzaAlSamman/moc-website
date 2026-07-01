import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CLIENT_IMAGE_MAX_EDGE,
  CLIENT_IMAGE_QUALITY,
  shouldCompressImage,
} from "./client-image-compression.mjs";

function fileStub(type, size = 1024) {
  return { type, size, name: `upload.${type.split("/")[1] || "bin"}` };
}

test("only browser-compressible image types are eligible for upload compression", () => {
  assert.equal(shouldCompressImage(fileStub("image/jpeg")), true);
  assert.equal(shouldCompressImage(fileStub("image/png")), true);
  assert.equal(shouldCompressImage(fileStub("image/webp")), true);

  assert.equal(shouldCompressImage(fileStub("image/gif")), false);
  assert.equal(shouldCompressImage(fileStub("application/pdf")), false);
  assert.equal(shouldCompressImage(fileStub("video/mp4")), false);
});

test("client compression uses conservative upload-friendly defaults", () => {
  assert.equal(CLIENT_IMAGE_MAX_EDGE, 2000);
  assert.equal(CLIENT_IMAGE_QUALITY, 0.82);
});
