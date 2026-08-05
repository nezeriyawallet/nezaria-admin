import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
export const metadata: Metadata = { title: "Nezaria Plinko — демо-гра", description: "Тестова гра Plinko від Nezaria.", icons: { icon: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="uk"><head><Script src="https://telegram.org/js/telegram-web-app.js?63" strategy="beforeInteractive" /></head><body>{children}</body></html>; }
