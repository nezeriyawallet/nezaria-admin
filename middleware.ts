import { NextRequest, NextResponse } from "next/server";

// Render exposes only the service root URL. The primary product is the
// administration dashboard; Nezeriya Pay remains available at /acquiring.
export function middleware(request: NextRequest) {
  return NextResponse.redirect(new URL("/admin", request.url));
}

export const config = { matcher: ["/"] };
