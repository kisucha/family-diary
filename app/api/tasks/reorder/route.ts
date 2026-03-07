import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { reorderTasksSchema } from "@/lib/validations/plan";

// ============================================================================
// PATCH /api/tasks/reorder
// 태스크 순서 변경 — Prisma 트랜잭션으로 여러 항목 한 번에 업데이트
// ============================================================================

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = reorderTasksSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const userId = BigInt(session.user.id);
  const { items } = parsed.data;

  if (items.length === 0) {
    return Response.json({ data: { updated: 0 } });
  }

  const itemIds = items.map((item) => BigInt(item.id));

  // 모든 대상 태스크가 본인 소유인지 검증
  const existingTasks = await prisma.planItem.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, userId: true },
  });

  const unauthorized = existingTasks.some((task) => task.userId !== userId);
  if (unauthorized || existingTasks.length !== items.length) {
    return Response.json(
      { error: "권한이 없거나 존재하지 않는 태스크가 포함되어 있습니다" },
      { status: 403 }
    );
  }

  // 트랜잭션으로 순서 일괄 업데이트
  await prisma.$transaction(
    items.map((item) =>
      prisma.planItem.update({
        where: { id: BigInt(item.id) },
        data: { sequenceOrder: item.sequenceOrder },
      })
    )
  );

  return Response.json({ data: { updated: items.length } });
}
