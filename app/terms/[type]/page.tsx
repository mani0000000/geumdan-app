import TermsTypePageClient from "./TermsTypePageClient";

export function generateStaticParams() {
  return [
    { type: "service" },
    { type: "privacy" },
    { type: "location" },
    { type: "marketing" },
  ];
}

export default function TermsTypePage() {
  return <TermsTypePageClient />;
}
