import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_ROUTES = new Set(["/login", "/signup"]);

function isPartnerRole(role: string | undefined): boolean {
  return role === "partner" || role === "owner";
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthed = request.cookies.get("zlot_auth")?.value === "1";
  const role = request.cookies.get("zlot_role")?.value;
  const roleDashboard = isPartnerRole(role) ? "/dashboard/owner" : "/dashboard";

  if (isProtectedPath(pathname) && !isAuthed) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (AUTH_ROUTES.has(pathname) && isAuthed) {
    return NextResponse.redirect(new URL(roleDashboard, request.url));
  }

  if (isAuthed && pathname === "/dashboard" && isPartnerRole(role)) {
    return NextResponse.redirect(new URL("/dashboard/owner", request.url));
  }

  if (isAuthed && pathname.startsWith("/dashboard/owner") && !isPartnerRole(role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
