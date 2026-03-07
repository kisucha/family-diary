import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateTaskSchema } from "@/lib/validations/plan";
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
  };
}

// ============================================================================
// PUT /api/tasks/:id
// 태스크 수정 (본인 태스크만). isCompleted true 시 completedAt = now()
// ============================================================================

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const taskId = BigInt(params.id);
  const userId = BigInt(session.user.id);

  // 존재 여부 + 본인 소유 확인
  const existing = await prisma.planItem.findUnique({
    where: { id: taskId },
  });

  if (!existing) {
    return Response.json({ error: "태스크를 찾을 수 없습니다" }, { status: 404 });
  }

  if (existing.userId !== userId) {
    return Response.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { isCompleted, actualTimeMinutes, ...rest } = parsed.data;

  // isCompleted 변경에 따라 completedAt 자동 처리
  let completedAt: Date | null | undefined = undefined;
  if (isCompleted === true) {
    completedAt = new Date();
  } else if (isCompleted === false) {
    completedAt = null;
  }

  const updated = await prisma.planItem.update({
    where: { id: taskId },
    data: {
      ...rest,
      ...(isCompleted !== undefined && { isCompleted }),
      ...(completedAt !== undefined && { completedAt }),
      ...(actualTimeMinutes !== undefined && { actualTimeMinutes }),
    },
  });

  return Response.json({ data: serializeTask(updated) });
}

// ============================================================================
// DELETE /api/tasks/:id
// 태스크 삭제 (본인 태스크만)
// ============================================================================

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const taskId = BigInt(params.id);
  const userId = BigInt(session.user.id);

  // 존재 여부 + 본인 소유 확인
  const existing = await prisma.planItem.findUnique({
    where: { id: taskId },
  });

  if (!existing) {
    return Response.json({ error: "태스크를 찾을 수 없습니다" }, { status: 404 });
  }

  if (existing.userId !== userId) {
    return Response.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  await prisma.planItem.delete({ where: { id: taskId } });

  return Response.json({ data: { id: params.id, deleted: true } });
}
