import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// 인증 없이 접근 가능한 경로
const PUBLIC_PATHS = ["/login", "/register", "/api/auth", "/api/health", "/api/cron"];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isPublicPath = PUBLIC_PATHS.some((path) =>
    nextUrl.pathname.startsWith(path)
  );

  // 공개 경로는 통과
  if (isPublicPath) return NextResponse.next();

  // 미인증 사용자 → 로그인 페이지
  if (!session) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // admin 전용 경로 검증
  if (nextUrl.pathname.startsWith("/admin")) {
    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
