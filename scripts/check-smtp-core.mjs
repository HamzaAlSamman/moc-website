export function validateSmtpTestRecipient(value) {
  const recipient = String(value ?? "").trim();
  const singleEmail = /^[^\s,@]+@[^\s,@]+\.[^\s,@]+$/;
  if (!singleEmail.test(recipient)) {
    throw new Error("SMTP_TEST_TO must contain exactly one valid controlled recipient address");
  }
  return recipient;
}
