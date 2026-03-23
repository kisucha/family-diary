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
    parentTaskId: item.parentTaskId ? item.parentTaskId.toString() : null,
    completedAt: item.completedAt ? item.completedAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

// ============================================================================
// POST /api/plans/tasks
// 태스크 생성. dailyPlanId가 없을 경우 해당 날짜 계획 자동 생성 후 추가.
// estimatedTimeMinutes > 1440(24시간) 이면 후속 날짜에도 자동으로 태스크 생성.
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
  let startDate: Date | null = null;

  if (!body.dailyPlanId && body.date) {
    const planDate = new Date(body.date);
    startDate = planDate;
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
    select: { userId: true, planDate: true },
  });

  if (!plan) {
    return Response.json({ error: "계획을 찾을 수 없습니다" }, { status: 404 });
  }

  if (plan.userId !== userId) {
    return Response.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  // startDate가 없으면 plan의 날짜 사용
  if (!startDate) {
    startDate = plan.planDate;
  }

  // 다중일 스패닝 계산 (1일 = 1440분 = 24시간)
  const estimatedMins = parsed.data.estimatedTimeMinutes ?? 0;
  const totalSpanDays = estimatedMins > 0 ? Math.ceil(estimatedMins / 1440) : 1;

  // 루트 태스크 생성 (day 1): 최대 1440분(24시간)만 배정
  const rootTask = await prisma.planItem.create({
    data: {
      dailyPlanId,
      userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      priority: parsed.data.priority,
      sequenceOrder: parsed.data.sequenceOrder,
      estimatedTimeMinutes:
        totalSpanDays > 1 ? Math.min(estimatedMins, 1440) : estimatedMins || null,
      category: parsed.data.category,
      tags: parsed.data.tags ?? undefined,
      totalSpanDays,
    },
  });

  // 다중일인 경우 후속 날짜에 자동 생성
  if (totalSpanDays > 1 && startDate) {
    let remainingMins = estimatedMins - 1440;

    for (let dayIndex = 1; dayIndex < totalSpanDays; dayIndex++) {
      const nextDate = new Date(startDate);
      nextDate.setDate(nextDate.getDate() + dayIndex);

      // 해당 날짜의 DailyPlan upsert
      const nextPlan = await prisma.dailyPlan.upsert({
        where: { userId_planDate: { userId, planDate: nextDate } },
        create: { userId, planDate: nextDate },
        update: {},
      });

      const dayMins = Math.min(remainingMins, 1440);
      remainingMins -= dayMins;

      await prisma.planItem.create({
        data: {
          dailyPlanId: nextPlan.id,
          userId,
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          priority: parsed.data.priority,
          sequenceOrder: 999,
          estimatedTimeMinutes: dayMins > 0 ? dayMins : null,
          category: parsed.data.category,
          tags: parsed.data.tags ?? undefined,
          parentTaskId: rootTask.id,
          totalSpanDays,
        },
      });
    }
  }

  return Response.json({ data: serializeTask(rootTask) }, { status: 201 });
}
