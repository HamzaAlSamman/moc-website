import CitizenAccountNav from "@/components/citizen/CitizenAccountNav";
import CitizenIdentityForm from "@/components/citizen/CitizenIdentityForm";
import CitizenPortalShell from "@/components/citizen/CitizenPortalShell";
import { getCurrentCitizen } from "@/lib/citizen-dal";

export const dynamic = "force-dynamic";
export default async function CitizenIdentityPage({ params }) { const { locale } = await params; const citizen = await getCurrentCitizen(locale); const isAr = locale === "ar"; return <CitizenPortalShell locale={locale} activeStage={citizen.identityStatus === "VERIFIED" ? 2 : 1}><CitizenAccountNav locale={locale} /><header className="mb-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#A48E68]">{isAr ? "توثيق آمن" : "Secure verification"}</p><h2 className="mt-2 text-3xl font-black text-[#002723]">{isAr ? "الهوية الوطنية" : "National identity"}</h2>{citizen.identityStatus === "REJECTED" && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{isAr ? "سبب الرفض: " : "Rejection reason: "}{citizen.identityRejectedReason}</p>}</header><CitizenIdentityForm locale={locale} status={citizen.identityStatus} submittedAt={citizen.identitySubmittedAt?.toISOString() || null} verifiedAt={citizen.identityVerifiedAt?.toISOString() || null} /></CitizenPortalShell>; }
