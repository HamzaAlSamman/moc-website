import CitizenAccountNav from "@/components/citizen/CitizenAccountNav";
import CitizenCopyrightSubmissions from "@/components/citizen/CitizenCopyrightSubmissions";
import CitizenPortalShell from "@/components/citizen/CitizenPortalShell";
import { getCurrentCitizen } from "@/lib/citizen-dal";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CitizenCopyrightPage({ params }) {
  const { locale } = await params;
  const citizen = await getCurrentCitizen(locale);

  const submissions = await prisma.copyrightSubmission.findMany({
    where: { citizenId: citizen.id },
    select: {
      id: true,
      referenceNo: true,
      workTitle: true,
      applicationStatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const safe = submissions.map((sub) => ({ ...sub, createdAt: sub.createdAt.toISOString() }));

  return (
    <CitizenPortalShell locale={locale} activeStage={2}>
      <CitizenAccountNav locale={locale} />
      <header className="mb-6">
        <p className="text-xs font-black tracking-[0.18em] text-[#A48E68]">
          {locale === "ar" ? "حماية الملكية الفكرية" : "Intellectual property protection"}
        </p>
        <h2 className="mt-2 text-3xl font-black text-[#002723]">
          {locale === "ar" ? "معاملات حقوق المؤلف" : "My copyright submissions"}
        </h2>
      </header>
      <CitizenCopyrightSubmissions submissions={safe} locale={locale} />
    </CitizenPortalShell>
  );
}
