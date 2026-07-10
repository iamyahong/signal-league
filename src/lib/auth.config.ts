import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleEnabled = Boolean(googleClientId && googleClientSecret);

// Edge-safe shared config — no PrismaAdapter, no bcrypt, no DB access.
// Used both by the light middleware auth instance (src/lib/auth.edge.ts)
// and spread into the full Node auth instance (src/lib/auth.ts).
export default {
  trustHost: true,
  basePath: "/auth",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: googleClientId!,
            clientSecret: googleClientSecret!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.status = token.status as typeof session.user.status;
        session.user.nickname = token.nickname as string;
        session.user.roles = token.roles as string[];
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
