import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FamilyEvent } from "@prisma/client";
import { CalendarClient } from "./components/CalendarClient";

// ============================================================================
// 타입 정의 (Client로 전달할 직렬화된 이벤트)
// ============================================================================

export type SerializedFamilyEvent = Omit<
  FamilyEvent,
  "id" | "familyId" | "createdByUserId"
> & {
  id: string;
  familyId: string;
  createdByUserId: string;
};

function serializeEvent(event: FamilyEvent): SerializedFamilyEvent {
  return {
    ...event,
    id: event.id.toString(),
    familyId: event.familyId.toString(),
    createdByUserId: event.createdByUserId.toString(),
  };
}

// ============================================================================
// Page Props
// ============================================================================

interface CalendarPageProps {
  searchParams: { month?: string };
}

// ============================================================================
// Server Component — SSR 초기 데이터 + CalendarClient로 위임
// ============================================================================

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // month 파라미터 파싱 (YYYY-MM, 없으면 현재 월)
  const rawMonth = searchParams.month;
  const currentMonth =
    rawMonth && /^\d{4}-\d{2}$/.test(rawMonth)
      ? rawMonth
      : new Date().toISOString().slice(0, 7);

  const [year, month] = currentMonth.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1, 0, 0, 0);
  const monthEnd = new Date(year, month, 1, 0, 0, 0);

  const familyId = BigInt(session.user.familyId);

  // SSR: Prisma로 직접 초기 이벤트 조회
  const rawEvents = await prisma.familyEvent.findMany({
    where: {
      familyId,
      startAt: { lt: monthEnd },
      endAt: { gte: monthStart },
    },
    orderBy: { startAt: "asc" },
  });

  const initialEvents: SerializedFamilyEvent[] = rawEvents.map(serializeEvent);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">가족 캘린더</h1>
        <p className="text-sm text-muted-foreground mt-1">
          가족의 일정을 함께 확인하고 관리하세요
        </p>
      </div>

      <CalendarClient
        initialMonth={currentMonth}
        initialEvents={initialEvents}
        userId={session.user.id}
        userRole={session.user.role}
      />
    </div>
  );
}
