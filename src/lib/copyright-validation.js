import { z } from "zod";

// Accepts Syrian local numbers (09 + 8 digits) as well as international
// numbers (optional leading +, 8-15 digits) for non-Syrian applicants.
const phoneRegex = /^\+?\d{8,15}$/;

export const fullSubmissionSchema = z
  .object({
    applicantName: z.string().trim().min(3, "الاسم الرباعي مطلوب (3 أحرف على الأقل)"),
    applicantPhone: z.string().trim().regex(phoneRegex, "رقم الموبايل غير صحيح"),
    applicantEmail: z.string().trim().email("صيغة البريد الإلكتروني غير صحيحة"),
    applicantRole: z.string().trim().min(1, "صفة مقدم الطلب مطلوبة"),
    idDocType: z.enum(["national_id", "passport"]).optional().default("national_id"),
    workTitle: z.string().trim().min(3, "عنوان العمل مطلوب (3 أحرف على الأقل)"),
    workCategory: z.enum(["written", "informational", "audio_visual", "fine_arts", "folklore"]),
    workOrigin: z.enum(["original", "derived"]),
    originalWorkName: z.string().trim().optional().default(""),
    originalPermission: z.string().trim().optional().default(""),
    workDesc: z.string().trim().min(10, "يرجى كتابة وصف لا يقل عن 10 أحرف"),
    province: z.string().trim().min(1, "المحافظة مطلوبة"),
    center: z.string().trim().min(1, "مركز الإيداع مطلوب"),
    // completionDate is no longer collected from the citizen — it is recorded
    // automatically as the submission timestamp in the API route.
    commercialRegisterFile: z.string().nullable().optional(),
    delegationFile: z.string().nullable().optional(),
    representativeIdFile: z.string().nullable().optional(),
    originalOwnerIdFile: z.string().nullable().optional(),
    workFile: z.string().nullable().optional(),
    workDriveUrl: z.string().trim().url().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.workOrigin === "derived") {
      if (!data.originalWorkName) {
        ctx.addIssue({ code: "custom", path: ["originalWorkName"], message: "اسم العمل الأصلي مطلوب لأن هذا العمل مقتبس" });
      }
      if (!data.originalPermission) {
        ctx.addIssue({ code: "custom", path: ["originalPermission"], message: "وثيقة موافقة صاحب العمل الأصلي مطلوبة" });
      }
    }
  });

// Re-validates the whole object and returns just the error message for one
// field (or null). Re-checking everything each call keeps cross-field rules
// (e.g. workOrigin === "derived") correct as other fields change — the form
// is small enough that this is cheap to call on every keystroke.
export function validateField(name, formSnapshot) {
  const result = fullSubmissionSchema.safeParse(formSnapshot);
  if (result.success) return null;
  const issue = result.error.issues.find((i) => i.path[0] === name);
  return issue ? issue.message : null;
}

// Returns a flat { fieldName: message } map for every invalid field — used
// on submit attempt (client) and by the API route (server).
export function validateAll(formSnapshot) {
  const result = fullSubmissionSchema.safeParse(formSnapshot);
  if (result.success) return {};
  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}
