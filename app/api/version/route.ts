export const dynamic = "force-dynamic";

export async function GET() {
  // Image-based Render deploys do not always expose a Git revision. HOSTNAME is
  // recreated with every new container, so it is a reliable fallback for the
  // client-side deployment watcher and prevents users staying on an old bundle.
  const version = process.env.RENDER_GIT_COMMIT || process.env.RENDER_DEPLOY_ID || process.env.VERCEL_GIT_COMMIT_SHA || process.env.HOSTNAME || "local";
  return Response.json({ version }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache" } });
}
