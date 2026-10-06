import { NextRequest, NextResponse } from "next/server";

// This Render service belongs exclusively to the Nezeriya company dashboard.
// The acquiring product lives in a separate project and must not be exposed
// from this domain.
export function middleware(request: NextRequest) {
  return NextResponse.redirect(new URL("/admin", request.url));
}

export const config = { matcher: ["/", "/acquiring/:path*"] };
