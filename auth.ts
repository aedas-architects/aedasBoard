import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

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
