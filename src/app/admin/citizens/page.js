import AdminShell from "@/components/admin/AdminShell";
import CitizenReviewDashboard from "@/components/admin/CitizenReviewDashboard";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function AdminCitizensPage() { const user = await getCurrentUser(); if (!can(user.role, "MANAGE_CITIZEN_ACCOUNTS") && !can(user.role, "REVIEW_CITIZEN_IDENTITY")) redirect("/admin/dashboard"); const citizens = await prisma.citizen.findMany({ select: { id: true, email: true, fullName: true, phone: true, nationalIdLast4: true, identityStatus: true, identitySubmittedAt: true, identityRejectedReason: true, isBlocked: true, blockedReason: true, createdAt: true }, orderBy: [{ identitySubmittedAt: "asc" }, { createdAt: "desc" }], take: 50 }); const safe = citizens.map((row) => ({ ...row, identitySubmittedAt: row.identitySubmittedAt?.toISOString() || null, createdAt: row.createdAt.toISOString() })); return <AdminShell user={user}><div className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black tracking-[0.18em] text-[#A48E68]">الهوية الرقمية</p><h1 className="mt-2 text-2xl font-black text-slate-900">حسابات المواطنين</h1><p className="mt-1 text-sm text-slate-500">البحث، مراجعة الهوية، والحظر الإداري الموثق.</p></div><a href="/admin/citizens/verifications" className="inline-flex min-h-11 items-center rounded-xl bg-[#003D33] px-4 text-sm font-bold text-white">طلبات التوثيق</a></header><CitizenReviewDashboard initialCitizens={safe} /></div></AdminShell>; }
