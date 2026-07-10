import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { UserStatus } from "@prisma/client";
import authConfig from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        if (email.endsWith("@signalleague.local")) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.nickname,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email;
        if (!email) return false;

        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true, nickname: true },
        });

        if (!dbUser?.nickname) {
          // 신규 Google 사용자 — 프로필 완성 페이지로 안내
          // nickname이 없으면 미완성 계정 (어댑터가 자동 생성했을 경우 포함)
          const params = new URLSearchParams({
            provider: "google",
            email: email,
            name: user.name ?? "",
          });
          return `/signup?${params.toString()}`;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.userId = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { roles: true },
        });
        if (dbUser) {
          token.status = dbUser.status;
          token.nickname = dbUser.nickname;
          token.roles = dbUser.roles.map((r) => r.role);
        }
      }
      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          include: { roles: true },
        });
        if (dbUser) {
          token.status = dbUser.status;
          token.nickname = dbUser.nickname;
          token.roles = dbUser.roles.map((r) => r.role);
        }
      }
      return token;
    },
  },
  events: {
    async signIn() {
      // 로그인 이벤트 훅 (필요 시 last_login_at 업데이트 등)
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      status: UserStatus;
      nickname: string;
      roles: string[];
    };
  }
}
