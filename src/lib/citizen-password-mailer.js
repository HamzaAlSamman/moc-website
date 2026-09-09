import "server-only";
import { wrapMinistryEmail } from "./mailer";
import { sendMailQueued } from "./queued-mail";
import { createCitizenPasswordMailer } from "./citizen-password-mailer-core.mjs";

const sendMail = (options) => sendMailQueued({ ...options, kindAr: "استعادة كلمة المرور", contextAr: "حساب مواطن" });

const mailer = createCitizenPasswordMailer({ sendMail, wrapMinistryEmail });

export const sendPasswordResetEmail = mailer.sendPasswordResetEmail;
