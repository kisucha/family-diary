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
import { GlobalSearch } from "@/components/search/GlobalSearch";

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

interface HeaderProps {
  userName: string;
  userEmail: string;
}

export function Header({ userName, userEmail }: HeaderProps) {
  const router = useRouter();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

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

      {/* 우측: 테마 선택 + 사용자 아바타 */}
      <div className="flex items-center gap-4">
        {/* 모바일용 날짜 (sm 미만) */}
        <p className="text-xs text-muted-foreground sm:hidden">
          {new Date().toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
          })}
        </p>

        {/* 전역 검색 */}
        <GlobalSearch />

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
