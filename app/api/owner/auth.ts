const encoder = new TextEncoder();

export async function verifyGoogleUser(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const authorization = request.headers.get("authorization");
  if (!supabaseUrl || !publishableKey || !authorization?.startsWith("Bearer ")) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: authorization },
  });
  return response.ok ? response.json() as Promise<{ id: string }> : null;
}

export async function createOwnerSession(userId: string) {
  const secret = process.env.OWNER_ACCESS_CODE;
  if (!secret) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const payload = `${userId}.${expiresAt}`;
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifyOwnerSession(request: Request, userId: string) {
  const secret = process.env.OWNER_ACCESS_CODE;
  const token = request.headers.get("x-owner-session");
  if (!secret || !token) return false;
  const [tokenUserId, expiresAtRaw, signature, ...extra] = token.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (extra.length || tokenUserId !== userId || !Number.isInteger(expiresAt) || expiresAt < Date.now() / 1000) return false;
  return safeEqual(signature, await sign(`${tokenUserId}.${expiresAt}`, secret));
}

export async function safeMatch(candidate: string, expected: string) {
  return safeEqual(await hash(candidate), await hash(expected));
}

/** Uses an authenticator-app TOTP secret, with the legacy static code as a migration fallback. */
export async function verifyOwnerSecondFactor(code: string) {
  const totpSecret = process.env.OWNER_2FA_TOTP_SECRET;
  if (totpSecret) return verifyTotp(code, totpSecret);
  const fallbackCode = process.env.OWNER_2FA_CODE;
  return fallbackCode ? safeMatch(code, fallbackCode) : true;
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

async function hash(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

function safeEqual(left: string | Uint8Array, right: string | Uint8Array) {
  const a = typeof left === "string" ? encoder.encode(left) : left;
  const b = typeof right === "string" ? encoder.encode(right) : right;
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function toBase64Url(bytes: Uint8Array) {
  let value = "";
  bytes.forEach((byte) => { value += String.fromCharCode(byte); });
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function verifyTotp(candidate: string, secret: string) {
  if (!/^\d{6}$/.test(candidate)) return false;
  const keyBytes = fromBase32(secret);
  if (!keyBytes.length) return false;
  const counter = Math.floor(Date.now() / 1000 / 30);
  return (await Promise.all([-1, 0, 1].map((offset) => createTotp(keyBytes, counter + offset))))
    .some((value) => safeEqual(candidate, value));
}

async function createTotp(secret: Uint8Array, counter: number) {
  const counterBytes = new Uint8Array(8);
  let remaining = counter;
  for (let index = 7; index >= 0; index -= 1) { counterBytes[index] = remaining & 0xff; remaining = Math.floor(remaining / 256); }
  const key = await crypto.subtle.importKey("raw", secret.buffer as ArrayBuffer, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes));
  const offset = digest[digest.length - 1] & 0x0f;
  const number = ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  return String(number % 1_000_000).padStart(6, "0");
}

function fromBase32(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = value.toUpperCase().replace(/[\s=-]/g, "");
  let buffer = 0, bits = 0;
  const output: number[] = [];
  for (const char of cleaned) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) return new Uint8Array();
    buffer = (buffer << 5) | digit; bits += 5;
    if (bits >= 8) { output.push((buffer >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return new Uint8Array(output);
}
