import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateGoalSchema } from "@/lib/validations/goal";
import { Goal } from "@prisma/client";

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
// PUT /api/goals/:id
// 목표 수정 (소유자만)
// ============================================================================

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const goalId = BigInt(params.id);
  const userId = BigInt(session.user.id);

  const existing = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!existing) return Response.json({ error: "목표를 찾을 수 없습니다" }, { status: 404 });
  if (existing.userId !== userId) return Response.json({ error: "권한이 없습니다" }, { status: 403 });

  const body = await request.json();
  const parsed = updateGoalSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { goalType, periodStartDate, periodEndDate, title, description, targetMetric, priority, isPublic, progressPercentage, status } = parsed.data;

  const updated = await prisma.goal.update({
    where: { id: goalId },
    data: {
      ...(goalType && { goalType }),
      ...(periodStartDate && { periodStartDate: new Date(periodStartDate) }),
      ...(periodEndDate && { periodEndDate: new Date(periodEndDate) }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(targetMetric !== undefined && { targetMetric }),
      ...(priority && { priority }),
      ...(isPublic !== undefined && { isPublic }),
      ...(progressPercentage !== undefined && { progressPercentage }),
      ...(status && { status }),
    },
  });

  return Response.json({ data: serializeGoal(updated) });
}

// ============================================================================
// DELETE /api/goals/:id
// 목표 삭제 (소유자만)
// ============================================================================

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const goalId = BigInt(params.id);
  const userId = BigInt(session.user.id);

  const existing = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!existing) return Response.json({ error: "목표를 찾을 수 없습니다" }, { status: 404 });
  if (existing.userId !== userId) return Response.json({ error: "권한이 없습니다" }, { status: 403 });

  await prisma.goal.delete({ where: { id: goalId } });

  return Response.json({ success: true });
}
