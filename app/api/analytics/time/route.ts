import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ko } from "date-fns/locale";

// ============================================================================
// GET /api/analytics/time?period=week|month|3month&from=DATE
// ============================================================================

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const userId = BigInt(session.user.id);
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "month";
  const fromParam = searchParams.get("from");

  const base = fromParam ? new Date(fromParam) : new Date();
  let fromDate: Date;
  let toDate: Date;

  if (period === "week") {
    fromDate = startOfWeek(base, { weekStartsOn: 1 });
    toDate = endOfWeek(base, { weekStartsOn: 1 });
  } else if (period === "3month") {
    fromDate = startOfMonth(subMonths(base, 2));
    toDate = endOfMonth(base);
  } else {
    // month (default)
    fromDate = startOfMonth(base);
    toDate = endOfMonth(base);
  }

  // 태스크 데이터
  const planItems = await prisma.planItem.findMany({
    where: {
      userId,
      dailyPlan: {
        planDate: { gte: fromDate, lte: toDate },
      },
    },
    include: {
      dailyPlan: { select: { planDate: true } },
    },
  });

  // 우선순위별 집계
  const byPriority = { A: 0, B: 0, C: 0 };
  const byPriorityCompleted = { A: 0, B: 0, C: 0 };
  for (const item of planItems) {
    const p = item.priority as "A" | "B" | "C";
    byPriority[p]++;
    if (item.isCompleted) byPriorityCompleted[p]++;
  }

  const priorityData = [
    { name: "A — 필수", total: byPriority.A, completed: byPriorityCompleted.A },
    { name: "B — 중요", total: byPriority.B, completed: byPriorityCompleted.B },
    { name: "C — 여유", total: byPriority.C, completed: byPriorityCompleted.C },
  ];

  // 요일별 집계 (0=일, 1=월, ..., 6=토)
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const byDay: { day: string; total: number; completed: number }[] = dayNames.map((d) => ({
    day: d, total: 0, completed: 0,
  }));

  for (const item of planItems) {
    const pd = item.dailyPlan.planDate;
    const date = pd instanceof Date ? pd : new Date(String(pd));
    const dayIdx = date.getDay();
    byDay[dayIdx].total++;
    if (item.isCompleted) byDay[dayIdx].completed++;
  }

  // 월별 집계 (3개월일 경우만 의미 있음)
  const monthlyMap = new Map<string, { total: number; completed: number }>();
  for (const item of planItems) {
    const pd = item.dailyPlan.planDate;
    const date = pd instanceof Date ? pd : new Date(String(pd));
    const key = format(date, "yyyy-MM");
    const existing = monthlyMap.get(key) ?? { total: 0, completed: 0 };
    existing.total++;
    if (item.isCompleted) existing.completed++;
    monthlyMap.set(key, existing);
  }

  const monthlyData = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => ({
      month: format(new Date(key + "-01"), "M월", { locale: ko }),
      ...val,
      rate: val.total > 0 ? Math.round((val.completed / val.total) * 100) : 0,
    }));

  // 파이차트용 우선순위 완료/미완료
  const pieData = [
    { name: "A 완료", value: byPriorityCompleted.A, fill: "#ef4444" },
    { name: "B 완료", value: byPriorityCompleted.B, fill: "#f59e0b" },
    { name: "C 완료", value: byPriorityCompleted.C, fill: "#3b82f6" },
    {
      name: "미완료",
      value: planItems.filter((i) => !i.isCompleted).length,
      fill: "#e2e8f0",
    },
  ].filter((d) => d.value > 0);

  // 요약
  const total = planItems.length;
  const completed = planItems.filter((i) => i.isCompleted).length;

  return Response.json({
    data: {
      period,
      fromDate: format(fromDate, "yyyy-MM-dd"),
      toDate: format(toDate, "yyyy-MM-dd"),
      summary: {
        total,
        completed,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      priorityData,
      byDay,
      monthlyData,
      pieData,
    },
  });
}
