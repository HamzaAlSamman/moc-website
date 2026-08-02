const SAFE_ISSUE_KEY = /^[a-zA-Z0-9_.:-]{1,256}$/;
const SAFE_SCOPE = /^[A-Z_]{1,64}$/;
const SAFE_FIELD = /^[a-zA-Z0-9_.-]{1,128}$/;

function response(status, error, code, extra = {}) {
  return {
    status,
    body: {
      error,
      message: error,
      ...(code ? { code } : {}),
      ...extra,
    },
  };
}

function safeRequirementIssues(issues) {
  if (!Array.isArray(issues)) return [];
  return issues
    .filter((issue) => (
      issue
      && typeof issue === "object"
      && typeof issue.key === "string"
      && SAFE_ISSUE_KEY.test(issue.key)
      && typeof issue.scope === "string"
      && SAFE_SCOPE.test(issue.scope)
    ))
    .slice(0, 200)
    .map((issue) => ({ key: issue.key, scope: issue.scope }));
}

function safeZodFields(error) {
  const fieldErrors = {};
  for (const issue of Array.isArray(error?.issues) ? error.issues.slice(0, 100) : []) {
    const field = Array.isArray(issue?.path) ? issue.path.join(".") : "";
    if (SAFE_FIELD.test(field)) fieldErrors[field] = ["Invalid value"];
  }
  return { fieldErrors, formErrors: [] };
}

export function legalLicenseError(
  error,
  fallback = "Unable to process legal-license request",
) {
  if (error?.code === "LEGAL_LICENSE_REQUIREMENTS_INCOMPLETE") {
    return response(
      400,
      "Legal-license requirements are incomplete",
      "LEGAL_LICENSE_REQUIREMENTS_INCOMPLETE",
      { issues: safeRequirementIssues(error.issues) },
    );
  }

  if (error?.code === "LEGAL_LICENSE_REQUEST_TOO_LARGE") {
    return response(
      413,
      "Legal-license request is too large",
      "LEGAL_LICENSE_REQUEST_TOO_LARGE",
    );
  }

  if (error?.code === "LEGAL_LICENSE_INVALID_REQUEST" || error?.name === "ZodError") {
    return response(
      400,
      "Invalid legal-license request",
      "LEGAL_LICENSE_INVALID_REQUEST",
      error?.name === "ZodError"
        ? { fields: safeZodFields(error) }
        : {},
    );
  }

  return response(400, fallback);
}
