import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAnnouncementSchema } from "@/lib/validations/announcement";
import { FamilyAnnouncement, User } from "@prisma/client";

// ============================================================================
// BigInt JSON 직렬화 헬퍼
// ============================================================================

type AnnouncementSerialized = Omit<FamilyAnnouncement, "id" | "familyId" | "createdByUserId"> & {
  id: string;
  familyId: string;
  createdByUserId: string;
  createdBy: { id: string; name: string };
};

function serializeAnnouncement(
  announcement: FamilyAnnouncement & { createdBy: Pick<User, "id" | "name"> }
): AnnouncementSerialized {
  return {
    ...announcement,
    id: announcement.id.toString(),
    familyId: announcement.familyId.toString(),
    createdByUserId: announcement.createdByUserId.toString(),
    createdBy: {
      id: announcement.createdBy.id.toString(),
      name: announcement.createdBy.name,
    },
  };
}

// ============================================================================
// GET /api/announcements
// 가족 공지사항 목록 조회
// ============================================================================

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const take = Math.min(Number(searchParams.get("take") ?? "20"), 50);
  const familyId = BigInt(session.user.familyId);

  const announcements = await prisma.familyAnnouncement.findMany({
    where: { familyId, isActive: true },
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take,
  });

  return Response.json({ data: announcements.map(serializeAnnouncement) });
}

// ============================================================================
// POST /api/announcements
// 공지사항 생성 (ADMIN / PARENT만)
// ============================================================================

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "PARENT") {
    return Response.json({ error: "공지사항 작성 권한이 없습니다" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createAnnouncementSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, content, priority, isPinned, pinnedUntil } = parsed.data;
  const userId = BigInt(session.user.id);
  const familyId = BigInt(session.user.familyId);

  const announcement = await prisma.familyAnnouncement.create({
    data: {
      familyId,
      createdByUserId: userId,
      title,
      content,
      priority,
      isPinned: isPinned ?? false,
      pinnedUntil: pinnedUntil ? new Date(pinnedUntil) : undefined,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return Response.json({ data: serializeAnnouncement(announcement) }, { status: 201 });
}
