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
    parentTaskId: item.parentTaskId ? item.parentTaskId.toString() : null,
  };
}

// ============================================================================
// PUT /api/tasks/:id
// 태스크 수정 (본인 태스크만). isCompleted true 시 completedAt = now()
// 다중일 스패닝 태스크인 경우 연결된 모든 태스크를 일괄 완료/미완료 처리
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

  const { isCompleted, actualTimeMinutes, description, ...rest } = parsed.data;

  // isCompleted 변경에 따라 completedAt 자동 처리
  let completedAt: Date | null | undefined = undefined;
  if (isCompleted === true) {
    completedAt = new Date();
  } else if (isCompleted === false) {
    completedAt = null;
  }

  // 다중일 스패닝 태스크인 경우 연결된 모든 태스크 일괄 처리
  // (완료 토글 + 메모 모두 연속 기간 전체에 동기화)
  if (existing.totalSpanDays > 1 && (isCompleted !== undefined || description !== undefined)) {
    // 루트 ID: 본인이 루트(parentTaskId=null)이면 자신, 아니면 parentTaskId
    const rootId = existing.parentTaskId ?? taskId;

    await prisma.planItem.updateMany({
      where: {
        OR: [
          { id: rootId },
          { parentTaskId: rootId },
        ],
      },
      data: {
        ...(isCompleted !== undefined && { isCompleted, completedAt }),
        ...(description !== undefined && { description }),
      },
    });

    // 현재 태스크에 나머지 필드도 반영 (우선순위, 카테고리 등)
    const updated = await prisma.planItem.update({
      where: { id: taskId },
      data: {
        ...rest,
        ...(actualTimeMinutes !== undefined && { actualTimeMinutes }),
      },
    });

    return Response.json({ data: serializeTask(updated) });
  }

  // 단일 태스크 업데이트
  const updated = await prisma.planItem.update({
    where: { id: taskId },
    data: {
      ...rest,
      ...(description !== undefined && { description }),
      ...(isCompleted !== undefined && { isCompleted }),
      ...(completedAt !== undefined && { completedAt }),
      ...(actualTimeMinutes !== undefined && { actualTimeMinutes }),
    },
  });

  return Response.json({ data: serializeTask(updated) });
}

// ============================================================================
// DELETE /api/tasks/:id
// 쿼리 파라미터: deleteMode = "single" | "from-here"
//   single    : 이 날짜 항목만 삭제. 루트 삭제 시 다음 자식을 새 루트로 승격.
//   from-here : 이 날짜 포함 이후 모든 연속 항목 삭제.
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

  const existing = await prisma.planItem.findUnique({
    where: { id: taskId },
  });

  if (!existing) {
    return Response.json({ error: "태스크를 찾을 수 없습니다" }, { status: 404 });
  }

  if (existing.userId !== userId) {
    return Response.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const url = new URL(request.url);
  const deleteMode = url.searchParams.get("deleteMode") ?? "single";

  // 단일 태스크 (연속 기간 없음) → 그냥 삭제
  if (existing.totalSpanDays <= 1) {
    await prisma.planItem.delete({ where: { id: taskId } });
    return Response.json({ data: { id: params.id, deleted: true } });
  }

  const rootId = existing.parentTaskId ?? taskId;

  if (deleteMode === "from-here") {
    // 현재 날짜 조회
    const currentPlan = await prisma.dailyPlan.findUnique({
      where: { id: existing.dailyPlanId },
      select: { planDate: true },
    });
    if (!currentPlan) {
      return Response.json({ error: "계획을 찾을 수 없습니다" }, { status: 404 });
    }

    // 현재 날짜 이후의 모든 연속 항목 삭제
    await prisma.planItem.deleteMany({
      where: {
        OR: [{ id: rootId }, { parentTaskId: rootId }],
        dailyPlan: { planDate: { gte: currentPlan.planDate } },
      },
    });
  } else {
    // "single": 이 날짜 항목만 삭제
    if (existing.parentTaskId === null) {
      // 루트 삭제 → 다음 자식을 새 루트로 승격
      const children = await prisma.planItem.findMany({
        where: { parentTaskId: taskId },
        include: { dailyPlan: { select: { planDate: true } } },
      });
      children.sort(
        (a, b) =>
          new Date(a.dailyPlan.planDate).getTime() -
          new Date(b.dailyPlan.planDate).getTime()
      );

      if (children.length > 0) {
        const newRoot = children[0];
        // 새 루트: parentTaskId 제거
        await prisma.planItem.update({
          where: { id: newRoot.id },
          data: { parentTaskId: null },
        });
        // 나머지 자식: 새 루트를 부모로 변경
        if (children.length > 1) {
          await prisma.planItem.updateMany({
            where: {
              parentTaskId: taskId,
              id: { not: newRoot.id },
            },
            data: { parentTaskId: newRoot.id },
          });
        }
      }
    }
    // 자식 태스크 혹은 승격 처리 후 현재 항목 삭제
    await prisma.planItem.delete({ where: { id: taskId } });
  }

  return Response.json({ data: { id: params.id, deleted: true } });
}
