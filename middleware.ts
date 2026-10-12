import { NextRequest, NextResponse } from "next/server";

// One image serves two Render services. APP_SURFACE selects which product a
// service exposes:
//   - "dashboard": the Nezeriya company dashboard (acquiring pages hidden)
//   - anything else (default): Nezeriya Pay acquiring (dashboard hidden)
// API routes are never redirected, so the terminal and wallet integrations keep
// working against either service.
function surface(): "dashboard" | "acquiring" {
  const value = globalThis.process?.env?.["APP_SURFACE"]?.trim().toLowerCase();
  return value === "dashboard" ? "dashboard" : "acquiring";
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  // Render receives traffic behind a TLS proxy. Preserve the public HTTPS
  // scheme so visitors do not receive an HTTP redirect.
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedProtocol) url.protocol = `${forwardedProtocol}:`;
  return NextResponse.redirect(url);
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAcquiringPage = path === "/acquiring" || path.startsWith("/acquiring/");

  if (surface() === "dashboard") {
    return isAcquiringPage ? redirectTo(request, "/") : NextResponse.next();
  }
  return isAcquiringPage ? NextResponse.next() : redirectTo(request, "/acquiring");
}

export const config = { matcher: ["/", "/admin", "/admin/:path*", "/acquiring", "/acquiring/:path*"] };
