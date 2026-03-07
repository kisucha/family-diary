import { Suspense } from "react";
import RegisterForm from "./_components/RegisterForm";

interface RegisterPageProps {
  searchParams: { token?: string };
}

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  const token = searchParams.token;

  // 초대 토큰이 없으면 안내 화면 표시
  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <span className="text-2xl">!</span>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            유효하지 않은 초대 링크
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            이 페이지는 관리자로부터 초대 링크를 받은 경우에만 접근할 수 있습니다.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            가족 관리자에게 초대 링크 재발송을 요청해주세요.
          </p>
        </div>
        <a
          href="/login"
          className="mt-2 text-sm text-slate-600 underline underline-offset-4 hover:text-slate-800"
        >
          로그인 페이지로 돌아가기
        </a>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="text-center py-8 text-slate-500">로딩 중...</div>}>
      <RegisterForm token={token} />
    </Suspense>
  );
}
