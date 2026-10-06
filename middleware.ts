import { NextRequest, NextResponse } from "next/server";

// This Render service belongs exclusively to Nezeriya Pay acquiring.
// The company dashboard has its own deployment and must never be served by
// the acquiring domain.
export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/acquiring";
  // Render receives traffic behind a TLS proxy. Preserve the public HTTPS
  // scheme so visitors do not receive an HTTP redirect.
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedProtocol) url.protocol = `${forwardedProtocol}:`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/", "/admin", "/admin/:path*"] };
