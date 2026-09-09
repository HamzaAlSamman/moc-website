import "server-only";
import { wrapMinistryEmail } from "./mailer";
import { sendMailQueued } from "./queued-mail";
import { createCitizenMailer } from "./citizen-mailer-core.mjs";

// Queued rather than sent directly: "ما وصلني رمز التحقق" is the single most
// common citizen complaint, and it used to leave nothing behind to check.
const sendMail = (options) => sendMailQueued({ ...options, kindAr: "رمز تحقق", contextAr: "تفعيل حساب مواطن" });

const citizenMailer = createCitizenMailer({ sendMail, wrapMinistryEmail });

export const sendCitizenOtpEmail = citizenMailer.sendCitizenOtpEmail;
