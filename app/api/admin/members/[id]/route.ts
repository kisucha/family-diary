import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchMemberSchema = z.object({
  role: z.enum(["ADMIN", "PARENT", "CHILD"]).optional(),
  isActive: z.boolean().optional(),
  colorTag: z.string().max(20).optional().nullable(),
});

// ============================================================================
// PATCH /api/admin/members/:id — 역할·활성 상태 변경
// ============================================================================

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return Response.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const targetId = BigInt(params.id);
  const currentUserId = BigInt(session.user.id);

  if (targetId === currentUserId) {
    return Response.json({ error: "자기 자신은 수정할 수 없습니다" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, familyId: true },
  });
  if (!existing || existing.familyId !== BigInt(session.user.familyId)) {
    return Response.json({ error: "구성원을 찾을 수 없습니다" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = patchMemberSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: parsed.data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      colorTag: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return Response.json({
    data: {
      ...updated,
      id: updated.id.toString(),
      lastLoginAt: updated.lastLoginAt ? updated.lastLoginAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
    },
  });
}
