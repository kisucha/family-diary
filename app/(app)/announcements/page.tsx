import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AnnouncementsClient } from "./components/AnnouncementsClient";

// ============================================================================
// Announcements Page — Server Component
// ============================================================================

export default async function AnnouncementsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const familyId = BigInt(session.user.familyId);

  const announcements = await prisma.familyAnnouncement.findMany({
    where: { familyId, isActive: true },
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 20,
  });

  const serialized = announcements.map((a) => ({
    ...a,
    id: a.id.toString(),
    familyId: a.familyId.toString(),
    createdByUserId: a.createdByUserId.toString(),
    pinnedUntil: a.pinnedUntil ? a.pinnedUntil.toISOString() : null,
    createdBy: { id: a.createdBy.id.toString(), name: a.createdBy.name },
  }));

  return (
    <AnnouncementsClient
      initialAnnouncements={serialized}
      userId={session.user.id}
      userRole={session.user.role}
    />
  );
}
