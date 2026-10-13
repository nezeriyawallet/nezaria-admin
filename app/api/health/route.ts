// Public connectivity check. Reports only whether each dependency is
// configured and reachable — never any secret values.
const env = (name: string) => process.env[name]?.trim() || "";

async function status(url: string, headers: Record<string, string>) {
  try {
    const response = await fetch(url, { headers, cache: "no-store" });
    return response.status;
  } catch {
    return "unreachable";
  }
}

export async function GET() {
  const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const walletUrl = (env("WALLET_API_BASE_URL") || env("NEZERIYA_WALLET_API_URL") || "https://bot-5k6u.onrender.com").replace(/\/+$/, "");
  const walletKey = env("WALLET_ADMIN_API_KEY");

  const [supabase, wallet] = await Promise.all([
    supabaseUrl && serviceKey
      ? status(`${supabaseUrl}/rest/v1/acquiring_stores?select=account&limit=1`, { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` })
      : Promise.resolve("not configured"),
    walletKey
      ? status(`${walletUrl}/admin/api/users/count`, { "X-Admin-Key": walletKey, Accept: "application/json" })
      : Promise.resolve("not configured"),
  ]);

  return Response.json({
    surface: env("APP_SURFACE") || "acquiring",
    configured: {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(supabaseUrl),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Boolean(env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(serviceKey),
      WALLET_API_BASE_URL: Boolean(env("WALLET_API_BASE_URL")),
      WALLET_ADMIN_API_KEY: Boolean(walletKey),
      OWNER_ACCESS_CODE: Boolean(env("OWNER_ACCESS_CODE")),
      OWNER_2FA_TOTP_SECRET: Boolean(env("OWNER_2FA_TOTP_SECRET")),
      TELEGRAM_SESSION_STRING: Boolean(env("TELEGRAM_SESSION_STRING")),
    },
    walletHost: new URL(walletUrl).host,
    checks: { supabase, wallet },
  }, { headers: { "Cache-Control": "no-store" } });
}
