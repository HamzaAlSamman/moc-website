import "server-only";

import { prisma } from "./prisma";
import {
  createCitizenIdentityReviewService,
  createPrismaCitizenIdentityReviewRepository,
} from "./citizen-identity-review-core.mjs";

export { CitizenIdentityReviewError } from "./citizen-identity-review-core.mjs";

export const citizenIdentityReviewService = createCitizenIdentityReviewService({
  repository: createPrismaCitizenIdentityReviewRepository(prisma),
});
