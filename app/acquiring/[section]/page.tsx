import { notFound } from "next/navigation";
import { MarketingPage } from "../marketing-page";

const sections = ["features", "how", "cabinet", "about", "security", "developers", "pricing", "faq"] as const;

export default async function PublicSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section as (typeof sections)[number])) notFound();
  return <MarketingPage section={section as (typeof sections)[number]} />;
}
