import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DailyPlanClient } from "./components/DailyPlanClient";
import { PlanItem } from "@prisma/client";
import { todayKST } from "@/lib/utils";

// ============================================================================
// 타입 정의
// ============================================================================

export type SerializedPlanItem = {
  id: string;
  dailyPlanId: string;
  userId: string;
  title: string;
  description: string | null;
  priority: "A" | "B" | "C";
  sequenceOrder: number;
  isCompleted: boolean;
  completedAt: string | null;
  estimatedTimeMinutes: number | null;
  actualTimeMinutes: number | null;
  category: string | null;
  tags: unknown;
  parentTaskId: string | null;
  totalSpanDays: number;
  createdAt: string;
  updatedAt: string;
};

export type SerializedDailyPlan = {
  id: string;
  userId: string;
  planDate: string;
  theme: string | null;
  reflection: string | null;
  focusAreas: unknown;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  planItems: SerializedPlanItem[];
};

// ============================================================================
// BigInt + Date 직렬화 헬퍼
// ============================================================================

function serializePlanItem(item: PlanItem): SerializedPlanItem {
  return {
    ...item,
    id: item.id.toString(),
    dailyPlanId: item.dailyPlanId.toString(),
    userId: item.userId.toString(),
    parentTaskId: item.parentTaskId ? item.parentTaskId.toString() : null,
    completedAt: item.completedAt ? item.completedAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

// ============================================================================
// Server Component
// ============================================================================

interface PlannerPageProps {
  searchParams: { date?: string };
}

export default async function PlannerPage({ searchParams }: PlannerPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 날짜 결정: searchParams.date 우선, 없으면 오늘
  const today = todayKST();
  const dateParam = searchParams.date ?? today;
  const targetDate = new Date(dateParam);

  const userId = BigInt(session.user.id);

  // 서버에서 초기 데이터 직접 조회 (Prisma)
  const rawPlan = await prisma.dailyPlan.findUnique({
    where: {
      userId_planDate: {
        userId,
        planDate: targetDate,
      },
    },
    include: {
      planItems: {
        orderBy: [{ priority: "asc" }, { sequenceOrder: "asc" }],
      },
    },
  });

  const initialPlan: SerializedDailyPlan | null = rawPlan
    ? {
        ...rawPlan,
        id: rawPlan.id.toString(),
        userId: rawPlan.userId.toString(),
        planDate: rawPlan.planDate.toISOString().split("T")[0],
        createdAt: rawPlan.createdAt.toISOString(),
        updatedAt: rawPlan.updatedAt.toISOString(),
        planItems: rawPlan.planItems.map(serializePlanItem),
      }
    : null;

  return (
    <DailyPlanClient
      initialDate={dateParam}
      initialPlan={initialPlan}
      userId={session.user.id}
    />
  );
}
