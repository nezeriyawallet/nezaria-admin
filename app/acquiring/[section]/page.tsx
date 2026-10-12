import { notFound } from "next/navigation";
import { MarketingPage } from "../marketing-page";
import { BusinessMarketingPage } from "../marketing-business";

const sections = ["features", "how", "cabinet", "about", "business", "security", "developers", "pricing", "faq"] as const;

export default async function PublicSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section as (typeof sections)[number])) notFound();
  if (section === "business") return <BusinessMarketingPage />;
  return <MarketingPage section={section as Exclude<(typeof sections)[number], "business">} />;
}
