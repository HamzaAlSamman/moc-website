import AdminShell from "@/components/admin/AdminShell";
import CitizenReviewDashboard from "@/components/admin/CitizenReviewDashboard";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function CitizenVerificationsPage() { const user = await getCurrentUser(); if (!can(user.role, "REVIEW_CITIZEN_IDENTITY")) redirect("/admin/dashboard"); const citizens = await prisma.citizen.findMany({ where: { identityStatus: "PENDING" }, select: { id: true, email: true, fullName: true, phone: true, nationalIdLast4: true, identityStatus: true, identitySubmittedAt: true, identityRejectedReason: true, isBlocked: true, blockedReason: true, createdAt: true }, orderBy: { identitySubmittedAt: "asc" }, take: 100 }); const safe = citizens.map((row) => ({ ...row, identitySubmittedAt: row.identitySubmittedAt?.toISOString() || null, createdAt: row.createdAt.toISOString() })); return <AdminShell user={user}><div className="space-y-6"><header><p className="text-xs font-black tracking-[0.18em] text-[#A48E68]">طابور المراجعة</p><h1 className="mt-2 text-2xl font-black text-slate-900">طلبات توثيق الهوية</h1><p className="mt-1 text-sm text-slate-500">الأقدم أولاً — القرار يرسل إشعاراً ويُسجل في سجل التدقيق.</p></header><CitizenReviewDashboard initialCitizens={safe} initialStatus="PENDING" canDelete={can(user.role, "DELETE_CITIZEN_ACCOUNTS")} canBlock={can(user.role, "MANAGE_CITIZEN_ACCOUNTS")} /></div></AdminShell>; }
