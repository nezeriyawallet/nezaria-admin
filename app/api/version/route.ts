export const dynamic = "force-dynamic";

export async function GET() {
  const version = process.env.RENDER_GIT_COMMIT || process.env.RENDER_DEPLOY_ID || process.env.VERCEL_GIT_COMMIT_SHA || "local";
  return Response.json({ version }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache" } });
}
