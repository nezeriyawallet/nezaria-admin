import { NextRequest, NextResponse } from "next/server";

// Render exposes only the service root URL. Make it open the merchant
// acquiring area, while keeping the existing admin application at /admin.
export function middleware(request: NextRequest) {
  return NextResponse.redirect(new URL("/acquiring", request.url));
}

export const config = { matcher: ["/"] };
