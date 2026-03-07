import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, addDays, format } from "date-fns";
import { ko } from "date-fns/locale";

// ============================================================================
// GET /api/review/weekly?week=YYYY-MM-DD  (월요일 기준)
// ============================================================================

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const userId = BigInt(session.user.id);
  const { searchParams } = new URL(request.url);
  const weekParam = searchParams.get("week");

  // 기준 날짜 (기본: 이번 주 월요일)
  const base = weekParam ? new Date(weekParam) : new Date();
  const weekStart = startOfWeek(base, { weekStartsOn: 1 }); // 월요일
  const weekEnd = endOfWeek(base, { weekStartsOn: 1 });   // 일요일

  // 1. 일별 태스크 완료율
  const planItems = await prisma.planItem.findMany({
    where: {
      userId,
      dailyPlan: {
        planDate: { gte: weekStart, lte: weekEnd },
      },
    },
    include: { dailyPlan: { select: { planDate: true } } },
  });

  // 요일별 집계 (월~일: 0~6 인덱스)
  const dailyStats: { day: string; total: number; completed: number; rate: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dayStr = format(day, "yyyy-MM-dd");
    const dayItems = planItems.filter((item) => {
      const pd = item.dailyPlan.planDate;
      const itemDate = pd instanceof Date
        ? pd.toISOString().split("T")[0]
        : String(pd);
      return itemDate === dayStr;
    });
    const total = dayItems.length;
    const completed = dayItems.filter((item) => item.isCompleted).length;
    dailyStats.push({
      day: format(day, "EEE", { locale: ko }),
      total,
      completed,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  }

  // 2. 감정 트렌드
  const emotions = await prisma.emotionCheckin.findMany({
    where: {
      userId,
      checkinDate: { gte: weekStart, lte: weekEnd },
    },
    orderBy: { checkinDate: "asc" },
  });

  const emotionTrend = emotions.map((e) => ({
    day: format(
      e.checkinDate instanceof Date ? e.checkinDate : new Date(String(e.checkinDate)),
      "EEE",
      { locale: ko }
    ),
    score: e.emotionScore,
    sleep: e.sleepHours !== null ? Number(e.sleepHours) : null,
  }));

  // 3. 주간 목표 집계
  const weeklyGoals = await prisma.goal.findMany({
    where: {
      userId,
      goalType: "WEEKLY",
      periodStartDate: { gte: new Date(format(weekStart, "yyyy-01-01")) },
      periodEndDate: { lte: new Date(format(weekEnd, "yyyy-12-31")) },
    },
  });

  const goalSummary = {
    total: weeklyGoals.length,
    completed: weeklyGoals.filter((g) => g.status === "COMPLETED").length,
    inProgress: weeklyGoals.filter((g) => g.status === "IN_PROGRESS").length,
  };

  // 4. 전체 요약
  const totalTasks = planItems.length;
  const completedTasks = planItems.filter((i) => i.isCompleted).length;

  return Response.json({
    data: {
      weekStart: format(weekStart, "yyyy-MM-dd"),
      weekEnd: format(weekEnd, "yyyy-MM-dd"),
      dailyStats,
      emotionTrend,
      goalSummary,
      summary: {
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        avgEmotionScore: emotions.length > 0
          ? Math.round((emotions.reduce((s, e) => s + e.emotionScore, 0) / emotions.length) * 10) / 10
          : null,
      },
    },
  });
}
