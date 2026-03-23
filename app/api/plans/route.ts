import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPlanSchema } from "@/lib/validations/plan";
import { todayKST } from "@/lib/utils";
import { DailyPlan, PlanItem } from "@prisma/client";

// ============================================================================
// BigInt JSON 직렬화 헬퍼
// ============================================================================

type PlanItemSerialized = Omit<PlanItem, "id" | "dailyPlanId" | "userId"> & {
  id: string;
  dailyPlanId: string;
  userId: string;
};

type DailyPlanSerialized = Omit<DailyPlan, "id" | "userId"> & {
  id: string;
  userId: string;
  planItems: PlanItemSerialized[];
};

function serializePlanItem(item: PlanItem): PlanItemSerialized {
  return {
    ...item,
    id: item.id.toString(),
    dailyPlanId: item.dailyPlanId.toString(),
    userId: item.userId.toString(),
  };
}

function serializePlan(
  plan: DailyPlan & { planItems: PlanItem[] }
): DailyPlanSerialized {
  return {
    ...plan,
    id: plan.id.toString(),
    userId: plan.userId.toString(),
    planItems: plan.planItems.map(serializePlanItem),
  };
}

// ============================================================================
// GET /api/plans?date=YYYY-MM-DD
// 일일 계획 + 태스크 조회. 없으면 null 반환.
// ============================================================================

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  // 날짜 파라미터가 없으면 오늘 날짜 사용
  const targetDate = dateParam
    ? new Date(dateParam)
    : new Date(todayKST());

  if (isNaN(targetDate.getTime())) {
    return Response.json(
      { error: "유효하지 않은 날짜 형식입니다" },
      { status: 400 }
    );
  }

  const userId = BigInt(session.user.id);

  const dailyPlan = await prisma.dailyPlan.findUnique({
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

  return Response.json({
    data: dailyPlan ? serializePlan(dailyPlan) : null,
  });
}

// ============================================================================
// POST /api/plans
// 일일 계획 upsert (날짜당 1개, UNIQUE 제약)
// ============================================================================

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createPlanSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { date, theme, reflection, focusAreas, isPublished } = parsed.data;
  const userId = BigInt(session.user.id);
  const planDate = new Date(date);

  const dailyPlan = await prisma.dailyPlan.upsert({
    where: {
      userId_planDate: { userId, planDate },
    },
    create: {
      userId,
      planDate,
      theme,
      reflection,
      focusAreas: focusAreas ?? undefined,
      isPublished: isPublished ?? true,
    },
    update: {
      theme,
      reflection,
      focusAreas: focusAreas ?? undefined,
      isPublished,
    },
    include: {
      planItems: {
        orderBy: [{ priority: "asc" }, { sequenceOrder: "asc" }],
      },
    },
  });

  return Response.json({ data: serializePlan(dailyPlan) }, { status: 201 });
}
