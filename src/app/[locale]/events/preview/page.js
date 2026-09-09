import EventPreviewClient from "./EventPreviewClient";

export default async function EventPreviewPage({ params }) {
  const { locale } = await params;
  return <EventPreviewClient locale={locale} />;
}
