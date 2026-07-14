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
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 8;
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
