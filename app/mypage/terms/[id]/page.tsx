import TermsPageClient from "./TermsPageClient";

export function generateStaticParams() {
  return [
    { id: "service" },
    { id: "privacy" },
    { id: "location" },
    { id: "marketing" },
  ];
}

export default function TermsDetailPage() {
  return <TermsPageClient />;
}
