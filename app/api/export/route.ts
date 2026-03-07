import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { format, subYears } from "date-fns";
import Papa from "papaparse";

// ============================================================================
// GET /api/export?type=plans|goals|notes|emotions&format=csv|json&from=DATE&to=DATE
// ============================================================================

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const userId = BigInt(session.user.id);
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "plans";
  const outputFormat = searchParams.get("format") ?? "csv";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const toDate = toParam ? new Date(toParam) : new Date();
  const fromDate = fromParam ? new Date(fromParam) : subYears(toDate, 1);

  // 최대 1년 제한
  const oneYearAgo = subYears(toDate, 1);
  const effectiveFrom = fromDate < oneYearAgo ? oneYearAgo : fromDate;

  let rows: object[] = [];
  let filename = "";

  if (type === "plans") {
    const plans = await prisma.dailyPlan.findMany({
      where: {
        userId,
        planDate: { gte: effectiveFrom, lte: toDate },
      },
      include: {
        planItems: { orderBy: [{ priority: "asc" }, { sequenceOrder: "asc" }] },
      },
      orderBy: { planDate: "asc" },
    });

    rows = plans.flatMap((plan) =>
      plan.planItems.map((item) => ({
        날짜: plan.planDate instanceof Date
          ? format(plan.planDate, "yyyy-MM-dd")
          : String(plan.planDate),
        테마: plan.theme ?? "",
        우선순위: item.priority,
        태스크: item.title,
        완료여부: item.isCompleted ? "완료" : "미완료",
        카테고리: item.category ?? "",
        메모: item.description ?? "",
      }))
    );
    filename = `plans_${format(effectiveFrom, "yyyyMMdd")}_${format(toDate, "yyyyMMdd")}`;
  } else if (type === "goals") {
    const goals = await prisma.goal.findMany({
      where: {
        userId,
        createdAt: { gte: effectiveFrom, lte: toDate },
      },
      orderBy: [{ goalType: "asc" }, { periodStartDate: "asc" }],
    });

    rows = goals.map((g) => ({
      유형: g.goalType,
      제목: g.title,
      설명: g.description ?? "",
      시작일: g.periodStartDate instanceof Date
        ? format(g.periodStartDate, "yyyy-MM-dd")
        : String(g.periodStartDate),
      종료일: g.periodEndDate instanceof Date
        ? format(g.periodEndDate, "yyyy-MM-dd")
        : String(g.periodEndDate),
      우선순위: g.priority,
      진행률: `${g.progressPercentage ?? 0}%`,
      상태: g.status,
    }));
    filename = `goals_${format(effectiveFrom, "yyyyMMdd")}_${format(toDate, "yyyyMMdd")}`;
  } else if (type === "notes") {
    const notes = await prisma.note.findMany({
      where: {
        userId,
        noteDate: { gte: effectiveFrom, lte: toDate },
      },
      orderBy: { noteDate: "asc" },
    });

    rows = notes.map((n) => ({
      날짜: n.noteDate instanceof Date
        ? format(n.noteDate, "yyyy-MM-dd")
        : String(n.noteDate),
      내용: n.content ?? "",
      기분: n.mood ?? "",
    }));
    filename = `notes_${format(effectiveFrom, "yyyyMMdd")}_${format(toDate, "yyyyMMdd")}`;
  } else if (type === "emotions") {
    const emotions = await prisma.emotionCheckin.findMany({
      where: {
        userId,
        checkinDate: { gte: effectiveFrom, lte: toDate },
      },
      orderBy: { checkinDate: "asc" },
    });

    rows = emotions.map((e) => ({
      날짜: e.checkinDate instanceof Date
        ? format(e.checkinDate, "yyyy-MM-dd")
        : String(e.checkinDate),
      감정: e.primaryEmotion,
      점수: e.emotionScore,
      수면시간: e.sleepHours !== null ? Number(e.sleepHours) : "",
      운동분: e.exerciseMinutes ?? "",
      메모: e.notes ?? "",
    }));
    filename = `emotions_${format(effectiveFrom, "yyyyMMdd")}_${format(toDate, "yyyyMMdd")}`;
  }

  if (outputFormat === "json") {
    return new Response(JSON.stringify(rows, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}.json"`,
      },
    });
  }

  // CSV
  const csv = Papa.unparse(rows);
  return new Response("\uFEFF" + csv, {  // BOM for Excel UTF-8
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
