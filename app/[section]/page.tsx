import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BusinessMarketingPage } from "../acquiring/marketing-business";
import { MarketingPage, type Section } from "../acquiring/marketing-page";

const routes = {
  features: "features",
  "how-it-works": "how",
  cabinet: "cabinet",
  about: "about",
  business: "business",
  developers: "developers",
  pricing: "pricing",
  faq: "faq",
} as const satisfies Record<string, Section>;

const seo: Record<keyof typeof routes, Metadata> = {
  features: { title: "Можливості — Nezeriya Pay", description: "Термінал, платіжні посилання та інтеграція оплати у сайт для бізнесу." },
  "how-it-works": { title: "Як це працює — Nezeriya Pay", description: "Від QR-входу до виплати у Nezeriya Wallet: як працює крипто-еквайринг." },
  cabinet: { title: "Кабінет бізнесу — Nezeriya Pay", description: "Платежі, товари, термінали, виплати та PDF-виписки в одному кабінеті." },
  about: { title: "Про нас — Nezeriya Pay", description: "Крипто-еквайринг Nezeriya Pay для малого та середнього бізнесу." },
  business: { title: "Бізнесам — Nezeriya Pay", description: "Сценарії криптооплати для кафе, магазинів, послуг та онлайн-бізнесу." },
  developers: { title: "Розробникам — Nezeriya Pay", description: "Інтеграція приймання USDT і GRAM у сайт чи застосунок." },
  pricing: { title: "Тарифи — Nezeriya Pay", description: "Комісія сервісу 0,5%, без щомісячної плати. TON-комісії сплачує Nezeriya Pay." },
  faq: { title: "FAQ — Nezeriya Pay", description: "Відповіді про комісії, термінали, виплати та інтеграцію." },
};

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  return section in seo ? seo[section as keyof typeof seo] : {};
}

export default async function PublicMarketingPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = routes[section as keyof typeof routes];
  if (!page) notFound();
  if (page === "business") return <BusinessMarketingPage />;
  return <MarketingPage section={page} />;
}
