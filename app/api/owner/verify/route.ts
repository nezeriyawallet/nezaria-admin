import { createOwnerSession, safeMatch, verifyGoogleUser, verifyOwnerSecondFactor } from "../auth";

export async function POST(request: Request) {
  const ownerCode = process.env.OWNER_ACCESS_CODE;
  if (!ownerCode) return Response.json({ ok: false }, { status: 401 });
  if (!process.env.OWNER_2FA_TOTP_SECRET && !process.env.OWNER_2FA_CODE) {
    return Response.json({ ok: false, error: "Двофакторна автентифікація CEO не налаштована." }, { status: 503 });
  }

  const user = await verifyGoogleUser(request);
  if (!user) return Response.json({ ok: false }, { status: 401 });

  const { code, twoFactorCode } = await request.json().catch(() => ({ code: "", twoFactorCode: "" }));
  if (typeof code !== "string" || code.length > 256 || !(await safeMatch(code, ownerCode))) {
    return Response.json({ ok: false }, { status: 403 });
  }
  if (typeof twoFactorCode !== "string" || twoFactorCode.length > 256 || !(await verifyOwnerSecondFactor(twoFactorCode))) {
    return Response.json({ ok: false, error: "Невірний код двофакторної автентифікації." }, { status: 403 });
  }

  const ownerSession = await createOwnerSession(user.id);
  return Response.json({ ok: true, ownerSession });
}
