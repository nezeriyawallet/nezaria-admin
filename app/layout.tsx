import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TonConnectProvider } from "./ton-connect-provider";
import { DeploymentRefresh } from "./deployment-refresh";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nezeriyapay.com"),
  title: "Nezeriya Pay — крипто-еквайринг для бізнесу",
  description: "Приймання оплат у USDT і GRAM для малого та середнього бізнесу: платіжні посилання, QR-коди, термінали й аналітика.",
  applicationName: "Nezeriya Pay",
  icons: {
    // Use the supplied raster mark: its details stay legible in browser tabs
    // and Google result favicons better than the simplified SVG fallback.
    icon: [{ url: "/nezeriya-pay-favicon-20260929.jpg", type: "image/jpeg", sizes: "640x640" }],
    shortcut: "/nezeriya-pay-favicon-20260929.jpg",
    apple: "/nezeriya-pay-favicon-20260929.jpg",
  },
  openGraph: {
    type: "website",
    locale: "uk_UA",
    url: "/",
    siteName: "Nezeriya Pay",
    title: "Nezeriya Pay — крипто-еквайринг для бізнесу",
    description: "Приймання оплат у USDT і GRAM: QR-коди, платіжні посилання, термінали й аналітика.",
  },
  twitter: {
    card: "summary",
    title: "Nezeriya Pay — крипто-еквайринг для бізнесу",
    description: "Приймання оплат у USDT і GRAM для малого та середнього бізнесу.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TonConnectProvider><DeploymentRefresh />{children}</TonConnectProvider>
      </body>
    </html>
  );
}
