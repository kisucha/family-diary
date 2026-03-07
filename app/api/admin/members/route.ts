import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ============================================================================
// GET /api/admin/members — ADMIN 전용 가족 구성원 목록 조회
// ============================================================================

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return Response.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const familyId = BigInt(session.user.familyId);

  const members = await prisma.user.findMany({
    where: { familyId },
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
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const serialized = members.map((m) => ({
    ...m,
    id: m.id.toString(),
    lastLoginAt: m.lastLoginAt ? m.lastLoginAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  }));

  return Response.json({ data: serialized });
}
