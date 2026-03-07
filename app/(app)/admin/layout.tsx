import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      {/* Admin 섹션 헤더 */}
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
        <p className="text-sm font-medium text-rose-800">
          관리자 영역 — 이 페이지는 ADMIN 계정만 접근 가능합니다.
        </p>
      </div>

      {/* 관리자 탭 네비게이션 */}
      <div className="flex gap-1 border-b border-slate-200">
        <Link
          href="/admin/invite"
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-700 border-b-2 border-transparent hover:border-indigo-500 transition-all -mb-px"
        >
          초대 코드
        </Link>
        <Link
          href="/admin/members"
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-700 border-b-2 border-transparent hover:border-indigo-500 transition-all -mb-px"
        >
          구성원 관리
        </Link>
      </div>

      {children}
    </div>
  );
}
