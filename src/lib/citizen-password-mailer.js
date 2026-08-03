import "server-only";
import { sendMail, wrapMinistryEmail } from "./mailer";
import { createCitizenPasswordMailer } from "./citizen-password-mailer-core.mjs";

const mailer = createCitizenPasswordMailer({ sendMail, wrapMinistryEmail });

export const sendPasswordResetEmail = mailer.sendPasswordResetEmail;
