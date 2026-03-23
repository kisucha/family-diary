import { prisma } from "@/lib/prisma";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

const TZ = process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Pacific/Auckland";

/** 타임존 기준 YYYY-MM-DD 반환 */
function todayInTZ(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date());
}

/** 타임존 기준 Date 객체의 요일(0=일…6=토) 반환 */
function getDayOfWeekInTZ(date: Date): number {
  const dayStr = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(dayStr);
}

/** 타임존 기준 MM-DD (요일) 형식 반환 */
function formatEventDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: TZ,
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  return `${month}-${day} (${weekday})`;
}

export interface BriefOptions {
  notifyPlans?: boolean;
  notifyEvents?: boolean;
  notifyIncomplete?: boolean;
}

/**
 * 해당 사용자의 일일 브리핑 메시지를 생성한다.
 */
export async function buildDailyBriefMessage(
  userId: bigint,
  familyId: bigint,
  userName: string,
  options: BriefOptions = {}
): Promise<string> {
  const {
    notifyPlans = true,
    notifyEvents = true,
    notifyIncomplete = true,
  } = options;

  const todayStr = todayInTZ(); // YYYY-MM-DD (타임존 기준)
  const today = new Date(todayStr);

  // 이번 주 월~일 계산
  const dayOfWeek = getDayOfWeekInTZ(new Date()); // 0=일, 1=월 ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + diffToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // 선택된 항목만 조회
  const dailyPlan = notifyPlans
    ? await prisma.dailyPlan.findUnique({
        where: { userId_planDate: { userId, planDate: today } },
        include: {
          planItems: { orderBy: [{ priority: "asc" }, { sequenceOrder: "asc" }] },
        },
      })
    : null;

  const familyEvents = notifyEvents
    ? await prisma.familyEvent.findMany({
        where: { familyId, startAt: { gte: weekStart, lte: weekEnd } },
        orderBy: { startAt: "asc" },
      })
    : [];

  const incompletePlans = notifyIncomplete
    ? await prisma.dailyPlan.findMany({
        where: { userId, planDate: { lt: today } },
        include: {
          planItems: { where: { isCompleted: false }, orderBy: { sequenceOrder: "asc" } },
        },
        orderBy: { planDate: "desc" },
      })
    : [];

  // ── 메시지 조립 ────────────────────────────────────────────
  const now = new Date();
  const dayName = DAY_NAMES[getDayOfWeekInTZ(now)];
  const dateLabel = `${todayStr} (${dayName})`;

  let msg = `📅 *${dateLabel} 일일 브리핑*\n안녕하세요, ${userName}님!\n`;

  // 오늘 계획 섹션
  if (notifyPlans) {
    const planItems = dailyPlan?.planItems ?? [];
    const priorities: Array<"A" | "B" | "C"> = ["A", "B", "C"];
    const priorityEmoji: Record<string, string> = { A: "🔴", B: "🟡", C: "🟢" };

    let hasPlanItems = false;
    for (const p of priorities) {
      const items = planItems.filter((item) => item.priority === p);
      if (items.length === 0) continue;
      hasPlanItems = true;
      msg += `\n${priorityEmoji[p]} *${p} 우선순위*\n`;
      for (const item of items) {
        const check = item.isCompleted ? "✅" : "⬜";
        msg += `• ${check} ${item.title}\n`;
      }
    }
    if (!hasPlanItems) {
      msg += "\n📋 *오늘 등록된 계획이 없습니다.*\n";
    }
  }

  // 이번 주 가족 일정 섹션
  if (notifyEvents) {
    msg += "\n─────────────────\n";
    msg += "📆 *이번 주 가족 일정*\n";
    if (familyEvents.length === 0) {
      msg += "• 이번 주 등록된 가족 일정이 없습니다.\n";
    } else {
      for (const ev of familyEvents) {
        const evLabel = formatEventDate(ev.startAt);
        msg += `• ${evLabel} ${ev.title}\n`;
      }
    }
  }

  // 미완료 태스크 섹션
  if (notifyIncomplete) {
    const incompleteItems = incompletePlans.flatMap((dp) =>
      dp.planItems.map((item) => ({ date: dp.planDate, title: item.title }))
    );
    if (incompleteItems.length > 0) {
      msg += "\n─────────────────\n";
      msg += "⚠️ *미완료 태스크 (전체)*\n";
      for (const item of incompleteItems.slice(0, 10)) {
        const dLabel = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(item.date).slice(5); // MM-DD
        msg += `• \\[${dLabel}\\] ${item.title}\n`;
      }
      if (incompleteItems.length > 10) {
        msg += `• _외 ${incompleteItems.length - 10}개..._\n`;
      }
    }
  }

  return msg;
}
