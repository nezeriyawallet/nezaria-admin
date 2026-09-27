"use client";

import { TonConnectUIProvider } from "@tonconnect/ui-react";

export function TonConnectProvider({ children }: { children: React.ReactNode }) {
  const origin = typeof window === "undefined" ? "https://nezeriyapay.com" : window.location.origin;
  return <TonConnectUIProvider manifestUrl={`${origin}/tonconnect-manifest.json`} language="uk" analytics={{ mode: "off" }}>{children}</TonConnectUIProvider>;
}
