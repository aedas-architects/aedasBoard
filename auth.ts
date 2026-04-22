import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

// Fail-fast sanity checks — crash at startup rather than silently degrade
// at request time if critical auth config is missing. App Service shows the
// error immediately in Log stream instead of you debugging a quiet redirect
// loop at 2am.
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET is not configured");
}
if (!process.env.AZURE_AD_CLIENT_ID || !process.env.AZURE_AD_CLIENT_SECRET || !process.env.AZURE_AD_TENANT_ID) {
  throw new Error("AZURE_AD_CLIENT_ID / AZURE_AD_CLIENT_SECRET / AZURE_AD_TENANT_ID must all be set");
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
  // header unless `trustHost` is on, producing `UntrustedHost` errors.
  // Safe because App Service is a trusted boundary — the proxy sets these
  // headers and strips any client-supplied duplicates.
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
