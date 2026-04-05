import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateAnnouncementSchema } from "@/lib/validations/announcement";
import { FamilyAnnouncement, User } from "@prisma/client";

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
// PUT /api/announcements/:id
// 공지사항 수정 (생성자 or ADMIN)
// ============================================================================

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const announcementId = BigInt(params.id);
  const userId = BigInt(session.user.id);
  const role = session.user.role;

  const existing = await prisma.familyAnnouncement.findUnique({ where: { id: announcementId } });
  if (!existing) return Response.json({ error: "공지사항을 찾을 수 없습니다" }, { status: 404 });
  if (existing.createdByUserId !== userId && role !== "ADMIN") {
    return Response.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateAnnouncementSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, content, priority, isPinned, pinnedUntil, isActive } = parsed.data;

  const updated = await prisma.familyAnnouncement.update({
    where: { id: announcementId },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(priority && { priority }),
      ...(isPinned !== undefined && { isPinned }),
      ...(pinnedUntil !== undefined && { pinnedUntil: pinnedUntil ? new Date(pinnedUntil) : null }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return Response.json({ data: serializeAnnouncement(updated) });
}

// ============================================================================
// DELETE /api/announcements/:id
// 공지사항 완전 삭제 (생성자 or ADMIN)
// ============================================================================

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const announcementId = BigInt(params.id);
  const userId = BigInt(session.user.id);
  const role = session.user.role;

  const existing = await prisma.familyAnnouncement.findUnique({ where: { id: announcementId } });
  if (!existing) return Response.json({ error: "공지사항을 찾을 수 없습니다" }, { status: 404 });
  if (existing.createdByUserId !== userId && role !== "ADMIN") {
    return Response.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  await prisma.familyAnnouncement.delete({ where: { id: announcementId } });

  return Response.json({ success: true });
}
