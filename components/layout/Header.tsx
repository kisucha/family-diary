"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Menu, BookHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUIStore } from "@/stores/useUIStore";
import { useTheme, type ThemeColor, type ThemeMode } from "@/components/theme-provider";

/** 오늘 날짜를 한국어 포맷으로 변환 (예: 2026년 3월 4일 (수)) */
function getTodayKorean(): string {
  return new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

/** 이름에서 아바타 이니셜 추출 (최대 2자) */
function getInitials(name: string): string {
  if (!name) return "?";
  const trimmed = name.trim();
  // 한글 이름: 성 + 이름 첫 글자 (2자)
  if (/[가-힣]/.test(trimmed)) {
    return trimmed.slice(0, 2);
  }
  // 영문 이름: 첫 글자들
  const parts = trimmed.split(" ").filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

/** 테마 색상 정의 */
const THEME_COLORS: { color: ThemeColor; hex: string; label: string }[] = [
  { color: "indigo",  hex: "#6366f1", label: "인디고" },
  { color: "sky",     hex: "#0ea5e9", label: "스카이" },
  { color: "emerald", hex: "#10b981", label: "에메랄드" },
  { color: "amber",   hex: "#f59e0b", label: "앰버" },
  { color: "rose",    hex: "#f43f5e", label: "로즈" },
];

interface HeaderProps {
  userName: string;
  userEmail: string;
}

export function Header({ userName, userEmail }: HeaderProps) {
  const router = useRouter();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const { theme, setTheme } = useTheme();

  const handleColorSelect = (color: ThemeColor) => {
    setTheme({ mode: theme.mode as ThemeMode, color });
  };

  const handleModeToggle = () => {
    setTheme({ ...theme, mode: theme.mode === "dark" ? "light" : "dark" });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 md:px-6 flex-shrink-0 z-10">
      {/* 좌측: 모바일 햄버거 + 로고 */}
      <div className="flex items-center gap-3">
        {/* 모바일에서만 표시 */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-muted-foreground hover:text-foreground"
          onClick={toggleSidebar}
          aria-label="메뉴 열기"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* 모바일 로고 (PC에서는 Sidebar에 로고가 있으므로 숨김) */}
        <div className="flex items-center gap-2 md:hidden">
          <BookHeart className="h-5 w-5 text-primary" />
          <span className="text-base font-bold text-foreground">
            FamilyPlanner
          </span>
        </div>
      </div>

      {/* 중앙: 오늘 날짜 */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden sm:block">
        <p className="text-sm font-medium text-muted-foreground">{getTodayKorean()}</p>
      </div>

      {/* 우측: 테마 선택 + 사용자 아바타 */}
      <div className="flex items-center gap-2">
        {/* 모바일용 날짜 (sm 미만) */}
        <p className="text-xs text-muted-foreground sm:hidden">
          {new Date().toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
          })}
        </p>

        {/* 테마 선택 영역 */}
        <div className="flex items-center gap-1.5 mr-1">
          {/* 라이트/다크 토글 */}
          <button
            onClick={handleModeToggle}
            className={`w-3 h-3 rounded-full border transition-transform hover:scale-125 flex-shrink-0 ${
              theme.mode === "light"
                ? "bg-slate-100 border-slate-400 ring-1 ring-offset-1 ring-slate-400"
                : "bg-slate-700 border-slate-500 ring-1 ring-offset-1 ring-slate-500"
            }`}
            title={theme.mode === "dark" ? "라이트 모드" : "다크 모드"}
            aria-label="라이트/다크 전환"
          />

          <span className="w-px h-3 bg-border" />

          {/* 색상 점들 */}
          {THEME_COLORS.map(({ color, hex, label }) => (
            <button
              key={color}
              onClick={() => handleColorSelect(color)}
              className={`w-3 h-3 rounded-full transition-transform hover:scale-125 flex-shrink-0 ${
                theme.color === color
                  ? "scale-125 ring-1 ring-offset-1 ring-slate-400 dark:ring-slate-500"
                  : ""
              }`}
              style={{ backgroundColor: hex }}
              title={label}
              aria-label={`${label} 테마`}
            />
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full h-9 w-9 hover:ring-2 hover:ring-primary/30 transition-all"
              aria-label="사용자 메뉴"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {userName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => router.push("/profile")}
              className="cursor-pointer"
            >
              프로필
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
            >
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
