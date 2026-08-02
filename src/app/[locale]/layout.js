import localFont from "next/font/local";
import "../globals.css";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { prisma } from "@/lib/prisma";
import { SettingsProvider } from "../../components/SettingsContext";
import NextTopLoader from "nextjs-toploader";

export const dynamic = "force-dynamic";

const qomra = localFont({
  src: [
    {
      path: "../fonts/itfQomraArabic-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/itfQomraArabic-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/itfQomraArabic-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-qomra-local",
  display: "swap",
});

// metadataBase lets Next.js resolve relative OG/canonical URLs to absolute ones
// (required for correct link previews on social platforms). Override the domain
// via NEXT_PUBLIC_SITE_URL; defaults to the live domain.
export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://moc.gov.sy"),
  title: {
    default: "وزارة الثقافة السورية - Syrian Ministry of Culture",
    template: "%s | وزارة الثقافة السورية",
  },
  description: "الموقع الرسمي لوزارة الثقافة في الجمهورية العربية السورية",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    siteName: "وزارة الثقافة السورية",
    title: "وزارة الثقافة السورية - Syrian Ministry of Culture",
    description: "الموقع الرسمي لوزارة الثقافة في الجمهورية العربية السورية",
  },
  twitter: {
    card: "summary_large_image",
    title: "وزارة الثقافة السورية - Syrian Ministry of Culture",
    description: "الموقع الرسمي لوزارة الثقافة في الجمهورية العربية السورية",
  },
};

// Generate static params for locales so Next.js knows them
export async function generateStaticParams() {
  return [{ locale: "ar" }, { locale: "en" }];
}

export default async function LocaleLayout(props) {
  const params = await props.params;
  const locale = params.locale || "ar";
  const { children } = props;
  const isRtl = locale === "ar";

  let dbSettings = {};
  try {
    const dbSettingsList = await prisma.setting.findMany();
    dbSettings = Object.fromEntries(dbSettingsList.map((s) => [s.key, s.value]));
  } catch (error) {
    console.warn("Warning: Failed to fetch database settings from Prisma:", error.message);
  }

  return (
    <html
      lang={locale}
      dir={isRtl ? "rtl" : "ltr"}
      className={`${qomra.variable} h-full scroll-smooth antialiased`}
    >
      <head>
        {/* Preconnect to Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Load Cairo and Inter online */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className={`min-h-full flex flex-col bg-white text-[#171717] ${isRtl ? "font-qomra" : "font-inter"}`}>
        <NextTopLoader
          color="#B9A779"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #B9A779,0 0 5px #B9A779"
        />
        <SettingsProvider dbSettings={dbSettings} locale={locale}>
          <Header locale={locale} />
          <main className="flex-grow flex flex-col">
            {children}
          </main>
          <Footer locale={locale} />
        </SettingsProvider>
      </body>
    </html>
  );
}
