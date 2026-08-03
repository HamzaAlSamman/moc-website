import "server-only";
import { prisma } from "./prisma";
import { sendCitizenOtpEmail } from "./citizen-mailer";
import {
  createCitizenEmailOtpService,
  createPrismaCitizenEmailOtpRepository,
} from "./citizen-email-otp-core.mjs";

const service = createCitizenEmailOtpService({
  repository: createPrismaCitizenEmailOtpRepository(prisma),
  sendCitizenOtpEmail,
});

export const issueEmailOtp = service.issueEmailOtp;
export const verifyEmailOtp = service.verifyEmailOtp;
export const resendEmailOtp = service.resendEmailOtp;
export const revokeEmailOtps = service.revokeEmailOtps;
