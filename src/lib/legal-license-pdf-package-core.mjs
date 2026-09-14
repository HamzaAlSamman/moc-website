const GENERATED_ATTACHMENT_KINDS = new Set(["APPLICATION_PDF", "ISSUED_LICENSE"]);

export function currentLegalLicenseAttachments(attachments = []) {
  const latest = new Map();
  for (const attachment of attachments) {
    if (!attachment?.id || GENERATED_ATTACHMENT_KINDS.has(attachment.kind)) continue;
    const key = `${attachment.kind}:${attachment.founderId || "application"}`;
    const previous = latest.get(key);
    if (!previous || Number(attachment.version || 0) > Number(previous.version || 0)) {
      latest.set(key, attachment);
    }
  }
  return [...latest.values()].sort((left, right) => (
    String(left.kind).localeCompare(String(right.kind), "en")
    || String(left.founderId || "").localeCompare(String(right.founderId || ""), "en")
  ));
}
