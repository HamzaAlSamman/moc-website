import "server-only";
import { prisma } from "./prisma";
import {
  citizenIdentityStorageKey,
  removeCitizenIdentityPrivateFile,
  validateCitizenIdentityUpload,
  writeCitizenIdentityPrivateFile,
} from "./citizen-identity-storage.mjs";
import {
  createCitizenIdentitySubmissionService,
  createPrismaCitizenIdentitySubmissionRepository,
} from "./citizen-identity-submission-core.mjs";

const service = createCitizenIdentitySubmissionService({
  repository: createPrismaCitizenIdentitySubmissionRepository(prisma),
  validateUpload: validateCitizenIdentityUpload,
  createStorageKey: citizenIdentityStorageKey,
  writeFile: writeCitizenIdentityPrivateFile,
  removeFile: removeCitizenIdentityPrivateFile,
});

export const submitCitizenIdentity = service.submitCitizenIdentity;
