import { createOwnerSession, safeMatch, verifyGoogleUser } from "../auth";

export async function POST(request: Request) {
  const ownerCode = process.env.OWNER_ACCESS_CODE;

  if (!ownerCode) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const user = await verifyGoogleUser(request);
  if (!user) return Response.json({ ok: false }, { status: 401 });

  const { code } = await request.json().catch(() => ({ code: "" }));
  if (typeof code !== "string" || code.length > 256 || !(await safeMatch(code, ownerCode))) {
    return Response.json({ ok: false }, { status: 403 });
  }
  const ownerSession = await createOwnerSession(user.id);
  return Response.json({ ok: true, ownerSession });
}
