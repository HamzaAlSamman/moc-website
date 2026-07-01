import NotFound404 from "@/components/NotFound404";

// Co-located so notFound() from this article route renders the branded 404
// inside the site layout (the locale-root not-found doesn't catch nested
// dynamic-segment routes reliably).
export default function NotFound() {
  return <NotFound404 />;
}
