import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createFamilyGoalSchema } from "@/lib/validations/family-goal";
import { FamilyGoal } from "@prisma/client";

// ============================================================================
// BigInt JSON 직렬화 헬퍼
// ============================================================================

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
// GET /api/family/goals?type=WEEKLY&period=YYYY-MM-DD
// ============================================================================

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const familyId = BigInt(session.user.familyId);
  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type");
  const periodParam = searchParams.get("period");

  const goals = await prisma.familyGoal.findMany({
    where: {
      familyId,
      ...(typeParam ? { goalType: typeParam as "WEEKLY" | "MONTHLY" | "YEARLY" } : {}),
      ...(periodParam ? { periodStartDate: new Date(periodParam) } : {}),
    },
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  return Response.json({ data: goals.map(serializeFamilyGoal) });
}

// ============================================================================
// POST /api/family/goals
// ============================================================================

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createFamilyGoalSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { goalType, periodStartDate, periodEndDate, title, description, targetMetric, priority, contributorUserIds } = parsed.data;
  const userId = BigInt(session.user.id);
  const familyId = BigInt(session.user.familyId);

  const goal = await prisma.familyGoal.create({
    data: {
      familyId,
      createdByUserId: userId,
      goalType,
      periodStartDate: new Date(periodStartDate),
      periodEndDate: new Date(periodEndDate),
      title,
      description,
      targetMetric,
      priority,
      contributorUserIds: contributorUserIds ? JSON.stringify(contributorUserIds) : undefined,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return Response.json({ data: serializeFamilyGoal(goal) }, { status: 201 });
}
