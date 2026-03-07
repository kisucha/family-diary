import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createTaskSchema } from "@/lib/validations/plan";
import { PlanItem } from "@prisma/client";

// ============================================================================
// BigInt JSON 직렬화 헬퍼
// ============================================================================

function serializeTask(item: PlanItem) {
  return {
    ...item,
    id: item.id.toString(),
    dailyPlanId: item.dailyPlanId.toString(),
    userId: item.userId.toString(),
    completedAt: item.completedAt ? item.completedAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

// ============================================================================
// POST /api/plans/tasks
// 태스크 생성. dailyPlanId가 없을 경우 해당 날짜 계획 자동 생성 후 추가.
// Body: createTaskSchema (dailyPlanId 필수) | { date, title, priority, ... }
// ============================================================================

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const userId = BigInt(session.user.id);
  const body = await request.json();

  // dailyPlanId가 없고 date가 있으면 자동으로 DailyPlan을 upsert한다
  let dailyPlanId: bigint;

  if (!body.dailyPlanId && body.date) {
    const planDate = new Date(body.date);
    const plan = await prisma.dailyPlan.upsert({
      where: { userId_planDate: { userId, planDate } },
      create: { userId, planDate },
      update: {},
    });
    dailyPlanId = plan.id;
    body.dailyPlanId = plan.id.toString();
  }

  const parsed = createTaskSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // dailyPlan 소유자 검증
  dailyPlanId = BigInt(parsed.data.dailyPlanId);
  const plan = await prisma.dailyPlan.findUnique({
    where: { id: dailyPlanId },
    select: { userId: true },
  });

  if (!plan) {
    return Response.json({ error: "계획을 찾을 수 없습니다" }, { status: 404 });
  }

  if (plan.userId !== userId) {
    return Response.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const task = await prisma.planItem.create({
    data: {
      dailyPlanId,
      userId,
      title: parsed.data.title,
      priority: parsed.data.priority,
      sequenceOrder: parsed.data.sequenceOrder,
      estimatedTimeMinutes: parsed.data.estimatedTimeMinutes,
      category: parsed.data.category,
      tags: parsed.data.tags ?? undefined,
    },
  });

  return Response.json({ data: serializeTask(task) }, { status: 201 });
}
