import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FamilyPlanner — 가족 전용 플래너",
  description: "초대된 가족 구성원만 이용할 수 있는 프라이빗 가족 플래너입니다.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
