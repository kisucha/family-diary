import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./components/DashboardClient";
import { DailyPlan, PlanItem, FamilyEvent, FamilyAnnouncement } from "@prisma/client";

// ============================================================================
// 직렬화 타입 정의
// ============================================================================

export type SerializedPlanItem = {
  id: string;
  title: string;
  priority: "A" | "B" | "C";
  isCompleted: boolean;
  sequenceOrder: number;
};

export type SerializedDailyPlan = {
  id: string;
  planDate: string;
  theme: string | null;
  planItems: SerializedPlanItem[];
};

export type SerializedFamilyEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  location: string | null;
  colorTag: string | null;
  category: string | null;
};

export type SerializedAnnouncement = {
  id: string;
  title: string;
  content: string;
  priority: string;
  isPinned: boolean;
};

export type SerializedOverdueTask = {
  id: string;
  title: string;
  priority: "A" | "B" | "C";
  planDate: string; // "YYYY-MM-DD"
};

// ============================================================================
// BigInt + Date 직렬화 헬퍼
// ============================================================================

function serializePlanItem(item: PlanItem): SerializedPlanItem {
  return {
    id: item.id.toString(),
    title: item.title,
    priority: item.priority as "A" | "B" | "C",
    isCompleted: item.isCompleted,
    sequenceOrder: item.sequenceOrder,
  };
}

function serializePlan(
  plan: DailyPlan & { planItems: PlanItem[] }
): SerializedDailyPlan {
  return {
    id: plan.id.toString(),
    planDate: plan.planDate.toISOString().split("T")[0],
    theme: plan.theme,
    planItems: plan.planItems.map(serializePlanItem),
  };
}

function serializeFamilyEvent(event: FamilyEvent): SerializedFamilyEvent {
  return {
    id: event.id.toString(),
    title: event.title,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    isAllDay: event.isAllDay,
    location: event.location,
    colorTag: event.colorTag,
    category: event.category,
  };
}

function serializeAnnouncement(a: FamilyAnnouncement): SerializedAnnouncement {
  return {
    id: a.id.toString(),
    title: a.title,
    content: a.content,
    priority: a.priority,
    isPinned: a.isPinned,
  };
}

// ============================================================================
// Dashboard Server Component
// ============================================================================

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = BigInt(session.user.id);
  const familyId = BigInt(session.user.familyId);

  // 오늘 날짜 (DATE 타입 조회용 — timezone 안전)
  const today = new Date(new Date().toISOString().split("T")[0]);

  // 이번 주 범위 계산 (월요일 ~ 일요일)
  const todayDay = today.getDay(); // 0=일, 1=월, ...
  const diffToMonday = todayDay === 0 ? -6 : 1 - todayDay;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + diffToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // 14일 전 날짜 (미완료 과거 태스크 조회 범위)
  const pastLimit = new Date(today);
  pastLimit.setDate(today.getDate() - 14);

  // 병렬 조회
  const [rawPlan, rawEvents, rawAnnouncements, rawOverdueTasks] = await Promise.all([
    // 오늘의 일일 계획
    prisma.dailyPlan.findUnique({
      where: { userId_planDate: { userId, planDate: today } },
      include: {
        planItems: {
          orderBy: [{ priority: "asc" }, { sequenceOrder: "asc" }],
        },
      },
    }),

    // 이번 주 가족 이벤트 (최대 5개)
    prisma.familyEvent.findMany({
      where: {
        familyId,
        startAt: { gte: weekStart, lte: weekEnd },
      },
      orderBy: { startAt: "asc" },
      take: 5,
    }),

    // 활성 공지사항 (핀 고정 우선, 최대 5개)
    prisma.familyAnnouncement.findMany({
      where: {
        familyId,
        isActive: true,
        OR: [
          { pinnedUntil: null },
          { pinnedUntil: { gte: new Date() } },
        ],
      },
      orderBy: [
        { isPinned: "desc" },
        { priority: "desc" },
        { createdAt: "desc" },
      ],
      take: 5,
    }),

    // 최근 14일 내 미완료 과거 태스크 (최대 15개)
    prisma.planItem.findMany({
      where: {
        dailyPlan: {
          userId,
          planDate: { gte: pastLimit, lt: today },
        },
        isCompleted: false,
      },
      include: {
        dailyPlan: { select: { planDate: true } },
      },
      orderBy: [
        { priority: "asc" },
        { dailyPlan: { planDate: "desc" } },
      ],
      take: 15,
    }),
  ]);

  const initialPlan = rawPlan ? serializePlan(rawPlan) : null;
  const weeklyEvents = rawEvents.map(serializeFamilyEvent);
  const announcements = rawAnnouncements.map(serializeAnnouncement);
  const overdueTasks: SerializedOverdueTask[] = rawOverdueTasks.map((item) => ({
    id: item.id.toString(),
    title: item.title,
    priority: item.priority as "A" | "B" | "C",
    planDate: (item.dailyPlan.planDate as Date).toISOString().split("T")[0],
  }));

  return (
    <DashboardClient
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      initialPlan={initialPlan}
      weeklyEvents={weeklyEvents}
      todayString={today.toISOString().split("T")[0]}
      announcements={announcements}
      overdueTasks={overdueTasks}
    />
  );
}
