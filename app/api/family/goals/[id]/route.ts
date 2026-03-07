import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateFamilyGoalSchema } from "@/lib/validations/family-goal";
import { FamilyGoal } from "@prisma/client";

type FamilyGoalSerialized = Omit<
  FamilyGoal,
  "id" | "familyId" | "createdByUserId" | "periodStartDate" | "periodEndDate"
> & {
  id: string;
  familyId: string;
  createdByUserId: string;
  periodStartDate: string;
  periodEndDate: string;
  createdBy: { id: string; name: string };
};

function serializeFamilyGoal(
  goal: FamilyGoal & { createdBy: { id: bigint; name: string } }
): FamilyGoalSerialized {
  return {
    ...goal,
    id: goal.id.toString(),
    familyId: goal.familyId.toString(),
    createdByUserId: goal.createdByUserId.toString(),
    periodStartDate: goal.periodStartDate instanceof Date
      ? goal.periodStartDate.toISOString().split("T")[0]
      : String(goal.periodStartDate),
    periodEndDate: goal.periodEndDate instanceof Date
      ? goal.periodEndDate.toISOString().split("T")[0]
      : String(goal.periodEndDate),
    createdBy: {
      id: goal.createdBy.id.toString(),
      name: goal.createdBy.name,
    },
  };
}

// ============================================================================
// PUT /api/family/goals/:id
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

  const existing = await prisma.familyGoal.findUnique({ where: { id: goalId } });
  if (!existing) {
    return Response.json({ error: "목표를 찾을 수 없습니다" }, { status: 404 });
  }
  if (existing.createdByUserId !== userId && session.user.role !== "ADMIN") {
    return Response.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateFamilyGoalSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { periodStartDate, periodEndDate, contributorUserIds, ...rest } = parsed.data;

  const goal = await prisma.familyGoal.update({
    where: { id: goalId },
    data: {
      ...rest,
      ...(periodStartDate ? { periodStartDate: new Date(periodStartDate) } : {}),
      ...(periodEndDate ? { periodEndDate: new Date(periodEndDate) } : {}),
      ...(contributorUserIds !== undefined
        ? { contributorUserIds: JSON.stringify(contributorUserIds) }
        : {}),
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return Response.json({ data: serializeFamilyGoal(goal) });
}

// ============================================================================
// DELETE /api/family/goals/:id
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

  const existing = await prisma.familyGoal.findUnique({ where: { id: goalId } });
  if (!existing) {
    return Response.json({ error: "목표를 찾을 수 없습니다" }, { status: 404 });
  }
  if (existing.createdByUserId !== userId && session.user.role !== "ADMIN") {
    return Response.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  await prisma.familyGoal.delete({ where: { id: goalId } });

  return Response.json({ success: true });
}
