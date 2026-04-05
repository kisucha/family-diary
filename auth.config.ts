import type { NextAuthConfig } from "next-auth";

/**
 * Edge Runtime 호환 auth 설정 (middleware.ts에서 사용)
 * bcryptjs / Prisma 등 Node.js 전용 모듈 사용 금지
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.familyId = (user as { familyId: string }).familyId;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.familyId = token.familyId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
};
