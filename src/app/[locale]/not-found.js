import NotFound404 from "@/components/NotFound404";

// Catches unmatched URLs / notFound() that resolve at the locale root.
export default function NotFound() {
  return <NotFound404 />;
}
