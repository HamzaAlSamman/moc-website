"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeletePostButton({ postId, backHref, labelAr = "الخبر" }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`هل أنت متأكد من حذف هذا ال${labelAr}؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/posts/${postId}`, { method: "DELETE" });
    if (res.ok) {
      router.push(backHref);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "تعذّر حذف العنصر");
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="ms-auto flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 transition"
    >
      <Trash2 className="w-3.5 h-3.5" />
      {deleting ? "جاري الحذف..." : `حذف ال${labelAr}`}
    </button>
  );
}
