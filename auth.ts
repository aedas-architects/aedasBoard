import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

// Fail-fast sanity checks — crash at runtime start-up rather than silently
// degrading at request time. Skipped during `next build` because Next
// evaluates route modules while collecting page data, long before the App
// Service env vars are ever loaded. `NEXT_PHASE` is set to
// `phase-production-build` during a production build.
if (process.env.NEXT_PHASE !== "phase-production-build") {
  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error("NEXTAUTH_SECRET is not configured");
  }
  if (
    !process.env.AZURE_AD_CLIENT_ID ||
    !process.env.AZURE_AD_CLIENT_SECRET ||
    !process.env.AZURE_AD_TENANT_ID
  ) {
    throw new Error(
      "AZURE_AD_CLIENT_ID / AZURE_AD_CLIENT_SECRET / AZURE_AD_TENANT_ID must all be set",
    );
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID!}/v2.0`,
      // User.ReadBasic.All lets us search the directory for people to add
      // as team members. openid/profile/email are the standard OIDC scopes.
      authorization: { params: { scope: "openid profile email offline_access User.ReadBasic.All" } },
    }),
  ],
  // Azure App Service terminates TLS at its reverse proxy and forwards the
  // original host via X-Forwarded-Host. NextAuth v5 refuses to honor that
  // unless it's explicitly told to — without this the deployed app throws
  // `UntrustedHost` on every request.
  //
  // Security notes:
  //  * The underlying Next process isn't internet-routable; all traffic
  //    must come through Azure's managed proxy, which normalizes the Host
  //    header to whichever hostname the client connected to.
  //  * If there's any doubt (shared infra, self-hosted proxy, etc) prefer
  //    pinning to a single known URL via AUTH_URL (or setting
  //    `trustHost: false` and making sure NEXTAUTH_URL is correct).
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Persist the Graph access token on the JWT so the server can call Graph
    // on the user's behalf without re-authenticating.
    jwt({ token, account }) {
      if (account?.access_token) {
        token.graphAccessToken = account.access_token;
      }
      return token;
    },
    // Expose the Entra user ID on the session so we can use it as the Cosmos
    // partition key. The Graph token is intentionally NOT on the session —
    // it stays in the encrypted JWT, only server code reads it.
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

declare module "next-auth/jwt" {
  interface JWT {
    graphAccessToken?: string;
  }
}
