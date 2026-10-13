import QRCode from "qrcode";
import { generateTotpSecret, verifyGoogleUser, verifyOwnerSession, verifyTotp } from "../auth";

// One-time owner 2FA enrolment. The secret is generated here and shown only to
// the signed-in owner; it is never stored server-side. After confirming a code,
// the owner saves it as OWNER_2FA_TOTP_SECRET on Render.
const configured = () => Boolean(process.env.OWNER_2FA_TOTP_SECRET?.trim());

async function authorize(request: Request) {
  const user = await verifyGoogleUser(request);
  return Boolean(user && (await verifyOwnerSession(request, user.id)));
}

export async function GET(request: Request) {
  if (!(await authorize(request))) return Response.json({ error: "Увійди як власник, щоб налаштувати 2FA." }, { status: 403 });
  if (configured()) return Response.json({ configured: true });

  const secret = generateTotpSecret();
  const uri = `otpauth://totp/${encodeURIComponent("Nezeriya:CEO")}?secret=${secret}&issuer=Nezeriya&algorithm=SHA1&digits=6&period=30`;
  const qrSvg = await QRCode.toString(uri, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return Response.json({ configured: false, secret, qrSvg }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!(await authorize(request))) return Response.json({ error: "Увійди як власник, щоб налаштувати 2FA." }, { status: 403 });
  if (configured()) return Response.json({ error: "2FA вже налаштована." }, { status: 409 });

  const { secret, code } = await request.json().catch(() => ({})) as { secret?: unknown; code?: unknown };
  if (typeof secret !== "string" || !/^[A-Z2-7]{32}$/.test(secret) || typeof code !== "string") {
    return Response.json({ error: "Некоректні дані." }, { status: 400 });
  }
  return (await verifyTotp(code, secret))
    ? Response.json({ ok: true })
    : Response.json({ error: "Код не збігається. Перевір, що відсканував саме цей QR, і введи свіжий код." }, { status: 400 });
}
