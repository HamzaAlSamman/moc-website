import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import SettingsForm from "@/components/admin/SettingsForm";

const DEFAULT_SETTINGS = [
  { key: "site_name_ar", value: "وزارة الثقافة السورية", group: "general", labelAr: "اسم الموقع (عربي)" },
  { key: "site_name_en", value: "Syrian Ministry of Culture", group: "general", labelAr: "اسم الموقع (إنجليزي)" },
  { key: "contact_email", value: "info@moc.gov.sy", group: "contact", labelAr: "البريد الإلكتروني" },
  { key: "contact_phone", value: "+963 11 333 4567", group: "contact", labelAr: "الهاتف" },
  { key: "cooperation_email", value: "cooperation@moc.gov.sy", group: "cooperation", labelAr: "البريد الإلكتروني المستلم لرسائل خدمة التعاون الدولي" },
  { key: "oversight_email", value: "oversight@moc.gov.sy", group: "oversight", labelAr: "البريد الإلكتروني المستلم لشكاوى الرقابة الداخلية" },
  { key: "address_ar", value: "سوريا - دمشق - ساحة عدنان المالكي", group: "contact", labelAr: "العنوان (عربي)" },
  { key: "address_en", value: "Syria - Damascus - Adnan al-Malki Square", group: "contact", labelAr: "العنوان (إنجليزي)" },
  { key: "facebook_url", value: "", group: "social", labelAr: "رابط Facebook" },
  { key: "twitter_url", value: "", group: "social", labelAr: "رابط Twitter/X" },
  { key: "youtube_url", value: "", group: "social", labelAr: "رابط YouTube" },
  { key: "posts_per_page", value: "10", group: "display", labelAr: "عدد المقالات في الصفحة" },
];

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "VIEW_SETTINGS")) redirect("/admin/dashboard");

  const dbSettings = await prisma.setting.findMany();
  const settingsMap = Object.fromEntries(dbSettings.map((s) => [s.key, s.value]));

  const settings = DEFAULT_SETTINGS.map((s) => ({
    ...s,
    value: settingsMap[s.key] ?? s.value,
  }));

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إعدادات الموقع</h1>
          <p className="mt-1 text-sm text-gray-500">إعدادات عامة للموقع الرسمي</p>
        </div>
        <SettingsForm settings={settings} canEdit={can(user.role, "EDIT_SETTINGS")} />
      </div>
    </AdminShell>
  );
}
