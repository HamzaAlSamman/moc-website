import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ROLES } from "@/lib/permissions";
import AdminShell from "@/components/admin/AdminShell";
import MediaLibrary from "@/components/admin/MediaLibrary";

export default async function MediaPage() {
  const user = await getCurrentUser();

  // The Media Office manages news/achievements but is intentionally kept out of
  // the shared media library (hidden from its sidebar). Enforce it on the page
  // too — hiding the nav link alone still let them in by typing the URL. They
  // keep UPLOAD_MEDIA so inline image uploads inside the post forms still work.
  if (user.role === ROLES.MEDIA_OFFICE) redirect("/admin/dashboard");

  const media = await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مكتبة الوسائط</h1>
          <p className="mt-1 text-sm text-gray-500">{media.length} ملف</p>
        </div>
        <MediaLibrary initialMedia={media} userRole={user.role} />
      </div>
    </AdminShell>
  );
}
