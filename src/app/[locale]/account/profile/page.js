import CitizenAccountNav from "@/components/citizen/CitizenAccountNav";
import CitizenPortalShell from "@/components/citizen/CitizenPortalShell";
import CitizenProfileCard from "@/components/citizen/CitizenProfileCard";
import { getCurrentCitizen } from "@/lib/citizen-dal";

export const dynamic = "force-dynamic";
export default async function CitizenProfilePage({ params }) { const { locale } = await params; const citizen = await getCurrentCitizen(locale); return <CitizenPortalShell locale={locale} activeStage={citizen.identityStatus === "VERIFIED" ? 2 : 1}><CitizenAccountNav locale={locale} /><CitizenProfileCard citizen={citizen} locale={locale} /></CitizenPortalShell>; }
