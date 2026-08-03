import CitizenAuthForm from "@/components/citizen/CitizenAuthForm";
import CitizenPortalShell from "@/components/citizen/CitizenPortalShell";

export default async function CitizenResetPage({ params, searchParams }) { const [{ locale }, query] = await Promise.all([params, searchParams]); return <CitizenPortalShell locale={locale} activeStage={0}><CitizenAuthForm locale={locale} mode="reset" resetToken={query.token || ""} /></CitizenPortalShell>; }
