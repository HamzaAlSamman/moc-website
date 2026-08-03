import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { validatePasswordStrength } from "./password-policy";
import {
  hashNationalId,
  isValidEmail,
  isValidNationalId,
  lastFour,
  normalizeEmail,
  normalizeNationalId,
} from "./citizen-identity.mjs";
import { createCitizenSession, deleteCitizenSession } from "./citizen-session";
import { issueEmailOtp, resendEmailOtp, verifyEmailOtp } from "./citizen-email-otp";
import { sendPasswordResetEmail } from "./citizen-password-mailer";
import {
  CitizenAuthError,
  createCitizenAuthService,
  createPrismaCitizenAuthRepository,
} from "./citizen-auth-core.mjs";

// Valid bcrypt hash used only to equalize missing-account login timing.
const DUMMY_PASSWORD_HASH = "$2b$12$lpEQk42oakWmF1Dr.mfoxu1Kq1S4YN0xMnLWPl0Ef9i8vGdNI9koq";

const service = createCitizenAuthService({
  repository: createPrismaCitizenAuthRepository(prisma),
  issueEmailOtp,
  verifyEmailOtp,
  resendEmailOtp,
  normalizeEmail,
  isValidEmail,
  normalizeNationalId,
  isValidNationalId,
  hashNationalId,
  nationalIdLastFour: lastFour,
  validatePassword: validatePasswordStrength,
  hashPassword: (password) => bcrypt.hash(password, 12),
  comparePassword: bcrypt.compare,
  dummyPasswordHash: DUMMY_PASSWORD_HASH,
  createSession: createCitizenSession,
  deleteSession: deleteCitizenSession,
  sendPasswordResetEmail,
});

export { CitizenAuthError };
export const registerCitizen = service.registerCitizen;
export const verifyCitizenEmail = service.verifyCitizenEmail;
export const resendCitizenEmail = service.resendCitizenEmail;
export const loginCitizen = service.loginCitizen;
export const logoutCitizenSession = service.logoutCitizenSession;
export const logoutAllCitizenSessions = service.logoutAllCitizenSessions;
export const forgotCitizenPassword = service.forgotCitizenPassword;
export const resetCitizenPassword = service.resetCitizenPassword;
