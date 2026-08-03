import "server-only";
import { sendMail, wrapMinistryEmail } from "./mailer";
import { createCitizenMailer } from "./citizen-mailer-core.mjs";

const citizenMailer = createCitizenMailer({ sendMail, wrapMinistryEmail });

export const sendCitizenOtpEmail = citizenMailer.sendCitizenOtpEmail;
