import { redirect } from "next/navigation";
import { getSessionOptional } from "@/lib/dal";
import AdminShell from "@/components/admin/AdminShell";
import localFont from "next/font/local";
import "@/app/globals.css";
import NextTopLoader from "nextjs-toploader";

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
  variable: "--font-qomra",
  display: "swap",
});

export const metadata = {
  title: "لوحة التحكم - وزارة الثقافة",
  description: "نظام إدارة محتوى وزارة الثقافة السورية",
};

export default async function AdminLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={qomra.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="bg-gray-50 font-qomra antialiased">
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
        {children}
      </body>
    </html>
  );
}
