"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  Target,
  User,
  FileText,
  Bell,
  Settings,
  LogOut,
  BookHeart,
  Users,
  BarChart2,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/planner", label: "플래너", icon: CalendarDays },
  { href: "/calendar", label: "캘린더", icon: Calendar },
  { href: "/goals", label: "목표", icon: Target },
  { href: "/family-goals", label: "가족 목표", icon: Users },
  { href: "/review", label: "주간 리뷰", icon: BarChart2 },
  { href: "/analytics", label: "시간 분석", icon: TrendingUp },
  { href: "/profile", label: "프로필", icon: User },
  { href: "/notes", label: "메모", icon: FileText },
  { href: "/announcements", label: "공지사항", icon: Bell },
  { href: "/admin", label: "관리", icon: Settings, adminOnly: true },
];

interface SidebarProps {
  role: string;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || role === "ADMIN"
  );

  return (
    <div className="flex h-full flex-col bg-background border-r border-border shadow-sm">
      {/* 로고 영역 */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
        <BookHeart className="h-6 w-6 text-primary flex-shrink-0" />
        <span className="text-lg font-bold text-foreground tracking-tight">
          FamilyPlanner
        </span>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              {item.label}
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* 하단: 사용자 정보 + 로그아웃 */}
      <div className="px-3 py-4 border-t border-border space-y-1">
        <div className="px-3 py-2 text-xs text-muted-foreground truncate">
          {userName} 님
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          로그아웃
        </Button>
      </div>
    </div>
  );
}
