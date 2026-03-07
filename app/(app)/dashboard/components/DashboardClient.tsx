"use client";

import Link from "next/link";
import {
  CalendarDays, CheckCircle2, Circle, Plus, ChevronRight,
  MapPin, Megaphone, Pin, AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type {
  SerializedDailyPlan,
  SerializedFamilyEvent,
  SerializedAnnouncement,
  SerializedOverdueTask,
} from "../page";

// ============================================================================
// 타입
// ============================================================================

interface DashboardClientProps {
  userName: string;
  userRole: string;
  initialPlan: SerializedDailyPlan | null;
  weeklyEvents: SerializedFamilyEvent[];
  todayString: string;
  announcements: SerializedAnnouncement[];
  overdueTasks: SerializedOverdueTask[];
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

function formatKoreanDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function formatShortDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

function formatEventTime(startAt: string, endAt: string, isAllDay: boolean): string {
  if (isAllDay) return "종일";
  const start = new Date(startAt);
  return start.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatEventDate(startAt: string): string {
  const date = new Date(startAt);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "오늘";
  if (date.toDateString() === tomorrow.toDateString()) return "내일";
  return date.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

function getPriorityColor(priority: "A" | "B" | "C"): string {
  switch (priority) {
    case "A": return "bg-red-500/10 text-red-500 dark:text-red-400 border-red-400/30";
    case "B": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-400/30";
    case "C": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-400/30";
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "ADMIN": return "관리자";
    case "PARENT": return "부모";
    case "CHILD": return "자녀";
    default: return role;
  }
}

function getAnnouncementBorderColor(priority: string): string {
  switch (priority) {
    case "URGENT": return "border-l-red-500";
    case "HIGH":   return "border-l-orange-400";
    case "NORMAL": return "border-l-primary";
    case "LOW":    return "border-l-border";
    default:       return "border-l-border";
  }
}

function getAnnouncementPriorityLabel(priority: string): string {
  switch (priority) {
    case "URGENT": return "긴급";
    case "HIGH":   return "중요";
    case "NORMAL": return "일반";
    case "LOW":    return "참고";
    default:       return "";
  }
}

function getAnnouncementBadgeStyle(priority: string): string {
  switch (priority) {
    case "URGENT": return "bg-red-500/10 text-red-500 dark:text-red-400 border-red-400/30";
    case "HIGH":   return "bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-400/30";
    case "NORMAL": return "bg-primary/10 text-primary border-primary/30";
    case "LOW":    return "bg-muted text-muted-foreground border-border";
    default:       return "bg-muted text-muted-foreground border-border";
  }
}

// ============================================================================
// 서브 컴포넌트: 공지사항 배너
// ============================================================================

function AnnouncementsBanner({ announcements }: { announcements: SerializedAnnouncement[] }) {
  if (announcements.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
          <Megaphone className="h-4 w-4 text-primary" />
          가족 공지사항
        </div>
        <Link
          href="/announcements"
          className="text-xs text-primary hover:text-primary/70 flex items-center gap-0.5"
        >
          전체 보기 <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {announcements.map((a) => (
          <div
            key={a.id}
            className={`flex items-start gap-3 rounded-lg border-l-4 bg-card px-4 py-3 border border-border ${getAnnouncementBorderColor(a.priority)}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {a.isPinned && (
                  <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}
                <span className="text-sm font-semibold text-foreground truncate">
                  {a.title}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${getAnnouncementBadgeStyle(a.priority)}`}
                >
                  {getAnnouncementPriorityLabel(a.priority)}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                {a.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 서브 컴포넌트: 미완료 과거 태스크 리마인더
// ============================================================================

function OverdueTasksReminder({ tasks }: { tasks: SerializedOverdueTask[] }) {
  if (tasks.length === 0) return null;

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            미완료 태스크 리마인더
          </CardTitle>
          <Link
            href="/planner"
            className="text-xs text-primary hover:text-primary/70 flex items-center gap-0.5 font-medium"
          >
            플래너 열기 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          아직 완료하지 못한 이전 계획이 {tasks.length}개 있습니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={`/planner?date=${task.planDate}`}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent transition-colors group"
              >
                <Circle className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 font-bold flex-shrink-0 border ${getPriorityColor(task.priority)}`}
                >
                  {task.priority}
                </Badge>
                <span className="text-xs text-foreground/85 flex-1 truncate group-hover:text-primary">
                  {task.title}
                </span>
                <span className="text-[10px] text-muted-foreground group-hover:text-primary/70 flex-shrink-0 whitespace-nowrap">
                  {formatShortDate(task.planDate)} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 서브 컴포넌트: 오늘의 계획 카드
// ============================================================================

function TodayPlanCard({
  plan,
  todayString,
}: {
  plan: SerializedDailyPlan | null;
  todayString: string;
}) {
  if (!plan || plan.planItems.length === 0) {
    return (
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            오늘의 계획
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {formatKoreanDate(todayString)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="rounded-full bg-muted p-3">
              <CalendarDays className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              오늘 계획이 아직 없습니다.
            </p>
            <Button asChild size="sm" className="mt-1">
              <Link href={`/planner?date=${todayString}`}>
                <Plus className="h-4 w-4 mr-1.5" />
                계획 작성하기
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = plan.planItems.length;
  const completed = plan.planItems.filter((t) => t.isCompleted).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const grouped: Record<"A" | "B" | "C", typeof plan.planItems> = {
    A: plan.planItems.filter((t) => t.priority === "A"),
    B: plan.planItems.filter((t) => t.priority === "B"),
    C: plan.planItems.filter((t) => t.priority === "C"),
  };

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            오늘의 계획
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary/80">
            <Link href={`/planner?date=${todayString}`}>
              전체 보기
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Link>
          </Button>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          {formatKoreanDate(todayString)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">전체 완료율</span>
            <span className="font-semibold text-foreground/85">
              {completed}/{total} 완료 ({completionRate}%)
            </span>
          </div>
          <Progress value={completionRate} className="h-1.5" />
        </div>

        {(["A", "B", "C"] as const).map((priority) => {
          const items = grouped[priority];
          if (items.length === 0) return null;
          const priorityCompleted = items.filter((t) => t.isCompleted).length;

          return (
            <div key={priority} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 font-bold border ${getPriorityColor(priority)}`}
                >
                  {priority}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {priorityCompleted}/{items.length}
                </span>
              </div>
              <ul className="space-y-1">
                {items.slice(0, 3).map((task) => (
                  <li key={task.id} className="flex items-center gap-2 text-sm">
                    {task.isCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500 dark:text-emerald-400" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40" />
                    )}
                    <span
                      className={
                        task.isCompleted
                          ? "text-muted-foreground line-through text-xs"
                          : "text-foreground/85 text-xs"
                      }
                    >
                      {task.title}
                    </span>
                  </li>
                ))}
                {items.length > 3 && (
                  <li className="text-xs text-muted-foreground pl-5">
                    외 {items.length - 3}개 더 있음
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 서브 컴포넌트: 이번 주 가족 이벤트 카드
// ============================================================================

function WeeklyEventsCard({ events }: { events: SerializedFamilyEvent[] }) {
  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            이번 주 가족 일정
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary/80">
            <Link href="/calendar">
              캘린더
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <div className="rounded-full bg-muted p-3">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">이번 주 가족 일정이 없습니다.</p>
            <Button asChild size="sm" variant="outline" className="mt-1">
              <Link href="/calendar">
                <Plus className="h-4 w-4 mr-1.5" />
                일정 추가
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-accent/30 px-3 py-2.5"
              >
                <div className="flex-shrink-0 flex flex-col items-center min-w-[42px]">
                  <span className="text-[10px] font-medium text-muted-foreground leading-none">
                    {formatEventDate(event.startAt)}
                  </span>
                  <span className="text-xs font-semibold text-primary mt-0.5">
                    {formatEventTime(event.startAt, event.endAt, event.isAllDay)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {event.title}
                  </p>
                  {event.location && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </p>
                  )}
                </div>
                {event.category && (
                  <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                    {event.category}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 서브 컴포넌트: 빠른 액션 카드
// ============================================================================

function QuickActionsCard({
  todayString,
  userRole,
}: {
  todayString: string;
  userRole: string;
}) {
  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground">
          빠른 실행
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="sm" className="justify-start gap-2 h-9">
            <Link href={`/planner?date=${todayString}`}>
              <Plus className="h-4 w-4 text-primary" />
              <span className="text-xs">태스크 추가</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="justify-start gap-2 h-9">
            <Link href="/calendar">
              <CalendarDays className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              <span className="text-xs">일정 등록</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="justify-start gap-2 h-9">
            <Link href="/notes">
              <CheckCircle2 className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              <span className="text-xs">오늘 메모</span>
            </Link>
          </Button>
          {userRole === "ADMIN" && (
            <Button asChild variant="outline" size="sm" className="justify-start gap-2 h-9">
              <Link href="/admin/invite">
                <Plus className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                <span className="text-xs">초대 링크</span>
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 메인 DashboardClient
// ============================================================================

export function DashboardClient({
  userName,
  userRole,
  initialPlan,
  weeklyEvents,
  todayString,
  announcements,
  overdueTasks,
}: DashboardClientProps) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 환영 헤더 */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">
            안녕하세요, {userName}님!
          </h1>
          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
            {getRoleLabel(userRole)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatKoreanDate(todayString)}
        </p>
      </div>

      {/* 공지사항 배너 */}
      <AnnouncementsBanner announcements={announcements} />

      {/* 메인 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TodayPlanCard plan={initialPlan} todayString={todayString} />
        <WeeklyEventsCard events={weeklyEvents} />
      </div>

      {/* 미완료 리마인더 */}
      <OverdueTasksReminder tasks={overdueTasks} />

      {/* 빠른 실행 */}
      <QuickActionsCard todayString={todayString} userRole={userRole} />
    </div>
  );
}
