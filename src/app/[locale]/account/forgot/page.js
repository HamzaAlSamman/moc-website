import CitizenAuthForm from "@/components/citizen/CitizenAuthForm";
import CitizenPortalShell from "@/components/citizen/CitizenPortalShell";

export default async function CitizenForgotPage({ params }) { const { locale } = await params; return <CitizenPortalShell locale={locale} activeStage={0}><CitizenAuthForm locale={locale} mode="forgot" /></CitizenPortalShell>; }
