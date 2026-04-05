import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

// MobileNav: Radix UI Sheet(포털) 사용 → SSR 비활성화로 hydration 불일치 방지
const MobileNav = dynamic(
  () => import("@/components/layout/MobileNav").then((m) => m.MobileNav),
  { ssr: false }
);

/**
 * 인증된 사용자 전용 앱 레이아웃
 *
 * 구조:
 * ┌─────────────────────────────────────────┐
 * │ Header (고정 상단, 전체 너비)           │
 * ├──────────────┬──────────────────────────┤
 * │ Sidebar      │ main (children)          │
 * │ (PC 고정)    │ (스크롤 가능)            │
 * │              │                          │
 * └──────────────┴──────────────────────────┘
 *
 * - 모바일: Sidebar 숨김, Header 햄버거 버튼으로 MobileNav Sheet 열기
 * - 세션 없으면 /login 으로 리다이렉트 (서버 컴포넌트에서 처리)
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* 데스크톱 사이드바 (md 이상에서 표시) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:flex-shrink-0">
        <Sidebar role={session.user.role} userName={session.user.name ?? ""} />
      </aside>

      {/* 모바일용 Sheet 네비게이션 */}
      <MobileNav role={session.user.role} userName={session.user.name ?? ""} />

      {/* 우측 영역: Header + main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userName={session.user.name ?? ""}
          userEmail={session.user.email ?? ""}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
