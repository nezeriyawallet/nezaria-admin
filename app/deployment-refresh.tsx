"use client";

import { useEffect } from "react";

export function DeploymentRefresh() {
  useEffect(() => {
    let current = "";
    let stopped = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(`/api/version?t=${Date.now()}`, { cache: "no-store" });
        const data = await response.json() as { version?: string };
        if (!data.version || stopped) return;
        if (current && current !== data.version) window.location.reload();
        current = data.version;
      } catch {
        // Keep the current page if the service is restarting during deployment.
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 30_000);
    window.addEventListener("visibilitychange", check);
    return () => { stopped = true; window.clearInterval(timer); window.removeEventListener("visibilitychange", check); };
  }, []);
  return null;
}
