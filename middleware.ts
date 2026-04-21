import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // API routes should never redirect to the login page — return 401 instead.
  // The board API fetches handle 401 gracefully.
  if (pathname.startsWith("/api/")) {
    if (!req.auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth;
  const isLoginPage = pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Skip Next.js internals and auth callback routes.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
