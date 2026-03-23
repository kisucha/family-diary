import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateIdeaSchema } from "@/lib/validations/idea";
import { IdeaMemo } from "@prisma/client";

function serializeIdea(item: IdeaMemo) {
  return {
    ...item,
    id: item.id.toString(),
    userId: item.userId.toString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }
  const userId = BigInt(session.user.id);
  const ideaId = BigInt(params.id);

  const existing = await prisma.ideaMemo.findUnique({ where: { id: ideaId } });
  if (!existing) return Response.json({ error: "메모를 찾을 수 없습니다" }, { status: 404 });
  if (existing.userId !== userId) return Response.json({ error: "권한이 없습니다" }, { status: 403 });

  const body = await request.json();
  const parsed = updateIdeaSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.ideaMemo.update({
    where: { id: ideaId },
    data: parsed.data,
  });

  return Response.json({ data: serializeIdea(updated) });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }
  const userId = BigInt(session.user.id);
  const ideaId = BigInt(params.id);

  const existing = await prisma.ideaMemo.findUnique({ where: { id: ideaId } });
  if (!existing) return Response.json({ error: "메모를 찾을 수 없습니다" }, { status: 404 });
  if (existing.userId !== userId) return Response.json({ error: "권한이 없습니다" }, { status: 403 });

  await prisma.ideaMemo.delete({ where: { id: ideaId } });
  return Response.json({ data: { id: params.id, deleted: true } });
}
