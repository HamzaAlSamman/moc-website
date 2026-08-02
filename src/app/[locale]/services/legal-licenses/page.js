import LegalLicenseWizard from "./LegalLicenseWizard";

export default async function LegalLicensesPage({ params }) {
  const { locale = "ar" } = await params;
  return <LegalLicenseWizard locale={locale} />;
}
