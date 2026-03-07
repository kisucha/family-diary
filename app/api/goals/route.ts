import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createGoalSchema } from "@/lib/validations/goal";
import { Goal } from "@prisma/client";

// ============================================================================
// BigInt JSON 직렬화 헬퍼
// ============================================================================

type GoalSerialized = Omit<Goal, "id" | "userId" | "periodStartDate" | "periodEndDate"> & {
  id: string;
  userId: string;
  periodStartDate: string;
  periodEndDate: string;
};

function serializeGoal(goal: Goal): GoalSerialized {
  return {
    ...goal,
    id: goal.id.toString(),
    userId: goal.userId.toString(),
    periodStartDate: goal.periodStartDate instanceof Date
      ? goal.periodStartDate.toISOString().split("T")[0]
      : String(goal.periodStartDate),
    periodEndDate: goal.periodEndDate instanceof Date
      ? goal.periodEndDate.toISOString().split("T")[0]
      : String(goal.periodEndDate),
  };
}

// ============================================================================
// GET /api/goals?type=WEEKLY&period=YYYY-MM-DD
// 목표 목록 조회
// ============================================================================

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const goalType = searchParams.get("type") as "WEEKLY" | "MONTHLY" | "YEARLY" | null;
  const period = searchParams.get("period");

  const userId = BigInt(session.user.id);

  const goals = await prisma.goal.findMany({
    where: {
      userId,
      ...(goalType && { goalType }),
      ...(period && { periodStartDate: new Date(period) }),
    },
    orderBy: [{ periodStartDate: "desc" }, { priority: "asc" }, { createdAt: "desc" }],
    take: 50,
  });

  return Response.json({ data: goals.map(serializeGoal) });
}

// ============================================================================
// POST /api/goals
// 목표 생성
// ============================================================================

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createGoalSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { goalType, periodStartDate, periodEndDate, title, description, targetMetric, priority, isPublic } = parsed.data;
  const userId = BigInt(session.user.id);

  const goal = await prisma.goal.create({
    data: {
      userId,
      goalType,
      periodStartDate: new Date(periodStartDate),
      periodEndDate: new Date(periodEndDate),
      title,
      description,
      targetMetric,
      priority,
      isPublic: isPublic ?? false,
    },
  });

  return Response.json({ data: serializeGoal(goal) }, { status: 201 });
}
