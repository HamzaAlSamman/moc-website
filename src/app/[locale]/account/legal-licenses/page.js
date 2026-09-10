import CitizenAccountNav from "@/components/citizen/CitizenAccountNav";
import CitizenLegalLicenses from "@/components/citizen/CitizenLegalLicenses";
import CitizenPortalShell from "@/components/citizen/CitizenPortalShell";
import { getCurrentCitizen } from "@/lib/citizen-dal";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CitizenLegalLicensesPage({ params }) {
  const { locale } = await params;
  const citizen = await getCurrentCitizen(locale);

  const applications = await prisma.legalLicenseApplication.findMany({
    where: { citizenId: citizen.id },
    select: {
      id: true,
      referenceNo: true,
      entityName: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const safe = applications.map((app) => ({ ...app, createdAt: app.createdAt.toISOString() }));

  return (
    <CitizenPortalShell locale={locale} activeStage={2}>
      <CitizenAccountNav locale={locale} />
      <header className="mb-6">
        <p className="text-xs font-black tracking-[0.18em] text-[#A48E68]">
          {locale === "ar" ? "التراخيص القانونية" : "Legal licensing"}
        </p>
        <h2 className="mt-2 text-3xl font-black text-[#002723]">
          {locale === "ar" ? "طلبات الترخيص" : "My license applications"}
        </h2>
      </header>
      <CitizenLegalLicenses applications={safe} locale={locale} />
    </CitizenPortalShell>
  );
}
