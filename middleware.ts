import { NextRequest, NextResponse } from "next/server";

// This Render service belongs exclusively to Nezeriya Pay acquiring.
// The company dashboard is deployed separately and must never be served by
// the acquiring domain.
export function middleware(request: NextRequest) {
  return NextResponse.redirect(new URL("/acquiring", request.url));
}

export const config = { matcher: ["/", "/admin"] };
