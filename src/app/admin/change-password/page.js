import { getCurrentUser } from "@/lib/dal";
import ChangePasswordForm from "@/components/admin/ChangePasswordForm";

// Intentionally rendered WITHOUT <AdminShell> — a user under the forced
// password-change gate (requirement #11) must not be able to navigate to
// the rest of the admin panel via the sidebar/topbar. proxy.js enforces the
// gate server-side on every request; this minimal layout keeps the UI
// consistent with that restriction.
export default async function ChangePasswordPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 font-qomra" dir="rtl">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">تغيير كلمة المرور</h1>
          <p className="mt-2 text-sm text-gray-500">
            {user.mustChangePassword
              ? "تم إجبارك على تعيين كلمة مرور جديدة من قبل أحد المسؤولين. يجب عليك تغييرها قبل المتابعة لاستخدام لوحة التحكم."
              : "يمكنك تغيير كلمة المرور الخاصة بحسابك من هنا."}
          </p>
        </div>
        <ChangePasswordForm forced={!!user.mustChangePassword} />
      </div>
    </div>
  );
}
