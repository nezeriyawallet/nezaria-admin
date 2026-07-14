export async function POST(request: Request) {
  const ownerCode = process.env.OWNER_ACCESS_CODE;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const authorization = request.headers.get("authorization");

  if (!ownerCode || !supabaseUrl || !publishableKey || !authorization?.startsWith("Bearer ")) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const session = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: authorization },
  });
  if (!session.ok) return Response.json({ ok: false }, { status: 401 });

  const { code } = await request.json().catch(() => ({ code: "" }));
  if (typeof code !== "string" || code.length > 256 || !(await safeMatch(code, ownerCode))) {
    return Response.json({ ok: false }, { status: 403 });
  }
  return Response.json({ ok: true });
}

async function safeMatch(candidate: string, expected: string) {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
