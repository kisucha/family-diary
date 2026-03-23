import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 날짜(Date) → "YYYY-MM-DD" 문자열
function toDateString(d: Date | null | undefined): string {
  if (!d) return "";
  return d instanceof Date
    ? d.toISOString().split("T")[0]
    : String(d).split("T")[0];
}

// BigInt 직렬화 헬퍼
function toStr(v: bigint | null | undefined): string {
  return v ? v.toString() : "";
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 1) {
    return Response.json({ error: "검색어를 입력해주세요" }, { status: 400 });
  }
  if (q.length > 100) {
    return Response.json({ error: "검색어가 너무 깁니다 (최대 100자)" }, { status: 400 });
  }

  const userId = BigInt(session.user.id);
  const familyId = BigInt(session.user.familyId);
  const LIMIT = 10;

  // 병렬로 모든 카테고리 검색
  const [rawTasks, rawAnnouncements, rawNotes, rawGoals, rawFamilyGoals, rawEvents, rawIdeas] =
    await Promise.all([
      // 태스크 (plan_items) - 내 것만
      prisma.planItem.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
          ],
        },
        include: {
          dailyPlan: { select: { planDate: true } },
        },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
      }),

      // 공지사항 (family_announcements) - 가족 공유
      prisma.familyAnnouncement.findMany({
        where: {
          familyId,
          isActive: true,
          OR: [
            { title: { contains: q } },
            { content: { contains: q } },
          ],
        },
        include: {
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: LIMIT,
      }),

      // 노트 (notes) - 내 것만
      prisma.note.findMany({
        where: {
          userId,
          content: { contains: q },
        },
        orderBy: { noteDate: "desc" },
        take: LIMIT,
      }),

      // 개인 목표 (goals) - 내 것만
      prisma.goal.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
      }),

      // 가족 목표 (family_goals)
      prisma.familyGoal.findMany({
        where: {
          familyId,
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
          ],
        },
        include: {
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
      }),

      // 가족 이벤트 (family_events)
      prisma.familyEvent.findMany({
        where: {
          familyId,
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
          ],
        },
        orderBy: { startAt: "desc" },
        take: LIMIT,
      }),

      // 아이디어 메모 (idea_memos) - 내 것만
      prisma.ideaMemo.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: q } },
            { content: { contains: q } },
          ],
        },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: LIMIT,
      }),
    ]);

  // 직렬화
  const tasks = rawTasks.map((item) => ({
    id: toStr(item.id),
    title: item.title,
    description: item.description ?? null,
    priority: item.priority,
    isCompleted: item.isCompleted,
    date: toDateString(item.dailyPlan?.planDate),
    link: `/planner?date=${toDateString(item.dailyPlan?.planDate)}`,
  }));

  const announcements = rawAnnouncements.map((item) => ({
    id: toStr(item.id),
    title: item.title,
    content: item.content.slice(0, 120) + (item.content.length > 120 ? "…" : ""),
    isPinned: item.isPinned,
    priority: item.priority,
    createdByName: item.createdBy?.name ?? null,
    createdAt: item.createdAt.toISOString(),
    link: "/announcements",
  }));

  const notes = rawNotes.map((item) => ({
    id: toStr(item.id),
    content: (item.content ?? "").slice(0, 120) + ((item.content?.length ?? 0) > 120 ? "…" : ""),
    date: toDateString(item.noteDate),
    link: `/notes?date=${toDateString(item.noteDate)}`,
  }));

  const goals = rawGoals.map((item) => ({
    id: toStr(item.id),
    title: item.title,
    description: item.description ?? null,
    goalType: item.goalType,
    status: item.status,
    progressPercentage: item.progressPercentage ?? 0,
    link: "/goals",
  }));

  const familyGoals = rawFamilyGoals.map((item) => ({
    id: toStr(item.id),
    title: item.title,
    description: item.description ?? null,
    goalType: item.goalType,
    status: item.status,
    progressPercentage: item.progressPercentage ?? 0,
    createdByName: item.createdBy?.name ?? null,
    link: "/family-goals",
  }));

  const events = rawEvents.map((item) => ({
    id: toStr(item.id),
    title: item.title,
    description: item.description ?? null,
    startAt: item.startAt.toISOString(),
    endAt: item.endAt.toISOString(),
    isAllDay: item.isAllDay,
    location: item.location ?? null,
    link: `/calendar?month=${item.startAt.toISOString().slice(0, 7)}`,
  }));

  const ideas = rawIdeas.map((item) => ({
    id: toStr(item.id),
    title: item.title,
    content: (item.content ?? "").slice(0, 120) + ((item.content?.length ?? 0) > 120 ? "…" : ""),
    category: item.category ?? null,
    isPinned: item.isPinned,
    colorTag: item.colorTag ?? null,
    link: "/ideas",
  }));

  const counts = {
    tasks: tasks.length,
    announcements: announcements.length,
    notes: notes.length,
    goals: goals.length,
    familyGoals: familyGoals.length,
    events: events.length,
    ideas: ideas.length,
    total: tasks.length + announcements.length + notes.length + goals.length + familyGoals.length + events.length + ideas.length,
  };

  return Response.json({
    query: q,
    results: { tasks, announcements, notes, goals, familyGoals, events, ideas },
    counts,
  });
}
