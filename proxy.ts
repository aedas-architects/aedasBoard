import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * A session is only considered valid if it carries a resolved user id. A
 * truthy `req.auth` alone isn't enough — NextAuth will still populate a
 * session shell from a stale/corrupt JWT cookie, which used to silently
 * let unauthenticated users through the gate.
 */
function isAuthenticated(req: { auth: unknown }): boolean {
  const auth = req.auth as { user?: { id?: unknown } } | null | undefined;
  return !!auth?.user?.id && typeof auth.user.id === "string";
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // API routes should never redirect to the login page — return 401 instead.
  if (pathname.startsWith("/api/")) {
    if (!isAuthenticated(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isLoggedIn = isAuthenticated(req);
  const isLoginPage = pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", req.url);
    // Preserve where the user was headed so we can bounce them back after sign-in.
    if (pathname !== "/") loginUrl.searchParams.set("callbackUrl", pathname);
    const res = NextResponse.redirect(loginUrl);
    // Clear any half-formed session cookies so the redirect loop can't stick.
    // Both names exist depending on HTTPS vs HTTP contexts.
    res.cookies.delete("authjs.session-token");
    res.cookies.delete("__Secure-authjs.session-token");
    return res;
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
