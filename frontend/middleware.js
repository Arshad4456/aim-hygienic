import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/";
  const isApi = pathname.startsWith("/api");
  const isStatic = pathname.startsWith("/_next") || pathname.startsWith("/favicon");

  if (isApi || isStatic) return NextResponse.next();

  const cookie = req.cookies.get("demo_user")?.value;
  const loggedIn = !!cookie;

  // If not logged in and trying dashboards => go login
  if (!loggedIn && pathname.startsWith("/dashboards")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // If logged in and at login => redirect to role dashboard
  if (loggedIn && isAuthPage) {
    try {
      const u = JSON.parse(cookie);
      return NextResponse.redirect(new URL(`/dashboards/${u.role.toLowerCase()}`, req.url));
    } catch {
      // if cookie broken, ignore
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboards/:path*"]
};
