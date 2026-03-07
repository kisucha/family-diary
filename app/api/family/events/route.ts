import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createEventSchema } from "@/lib/validations/event";
import { FamilyEvent } from "@prisma/client";

// ============================================================================
// BigInt JSON 직렬화 헬퍼
// ============================================================================

type FamilyEventSerialized = Omit<
  FamilyEvent,
  "id" | "familyId" | "createdByUserId"
> & {
  id: string;
  familyId: string;
  createdByUserId: string;
};

function serializeEvent(event: FamilyEvent): FamilyEventSerialized {
  return {
    ...event,
    id: event.id.toString(),
    familyId: event.familyId.toString(),
    createdByUserId: event.createdByUserId.toString(),
  };
}

// ============================================================================
// GET /api/family/events?month=YYYY-MM
// 해당 월의 가족 이벤트 목록 조회
// ============================================================================

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month"); // e.g. "2026-03"

  // month 파라미터가 없으면 현재 월 사용
  const targetMonth = monthParam ?? new Date().toISOString().slice(0, 7);

  // YYYY-MM 형식 검증
  if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
    return Response.json(
      { error: "month 파라미터는 YYYY-MM 형식이어야 합니다" },
      { status: 400 }
    );
  }

  const [year, month] = targetMonth.split("-").map(Number);

  // 해당 월의 시작(1일 00:00:00) ~ 마지막 날 (다음 달 1일 00:00:00 미만)
  const monthStart = new Date(year, month - 1, 1, 0, 0, 0);
  const monthEnd = new Date(year, month, 1, 0, 0, 0); // exclusive upper bound

  const familyId = BigInt(session.user.familyId);

  try {
    const events = await prisma.familyEvent.findMany({
      where: {
        familyId,
        // 이벤트가 해당 월과 조금이라도 겹치면 조회
        // (startAt < monthEnd) AND (endAt >= monthStart)
        startAt: { lt: monthEnd },
        endAt: { gte: monthStart },
      },
      orderBy: { startAt: "asc" },
    });

    return Response.json({ data: events.map(serializeEvent) });
  } catch (error) {
    console.error("[GET /api/family/events] DB 오류:", error);
    return Response.json({ error: "이벤트 조회에 실패했습니다" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/family/events
// 가족 이벤트 생성 + Supabase Broadcast 발행
// ============================================================================

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "요청 본문이 올바르지 않습니다" }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[POST /api/family/events] 검증 실패 body:", JSON.stringify(body));
    console.error("[POST /api/family/events] Zod 오류:", JSON.stringify(parsed.error.flatten(), null, 2));
    return Response.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    title,
    startAt,
    endAt,
    isAllDay,
    description,
    location,
    category,
    colorTag,
    eventType,
    attendeeUserIds,
  } = parsed.data;

  const userId = BigInt(session.user.id);
  const familyId = BigInt(session.user.familyId);

  // Prisma enum 매핑 (소문자 → 대문자 enum 값)
  const eventTypeMap = {
    standard: "STANDARD",
    birthday: "BIRTHDAY",
    anniversary: "ANNIVERSARY",
    holiday: "HOLIDAY",
  } as const;

  try {
    const event = await prisma.familyEvent.create({
      data: {
        familyId,
        createdByUserId: userId,
        title,
        description,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        location,
        isAllDay,
        category,
        colorTag,
        eventType: eventTypeMap[eventType],
        attendeeUserIds: attendeeUserIds ?? undefined,
      },
    });

    // Supabase Broadcast: 실제 Supabase URL이 설정된 경우에만 발행
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const isRealSupabase = supabaseUrl.includes(".supabase.co") && !supabaseUrl.includes("placeholder");
    if (isRealSupabase) {
      try {
        await supabaseAdmin
          .channel(`family-events-${familyId.toString()}`)
          .send({
            type: "broadcast",
            event: "event-changed",
            payload: { action: "created", eventId: event.id.toString() },
          });
      } catch (broadcastError) {
        console.warn("[POST /api/family/events] Broadcast 실패:", broadcastError);
      }
    }

    return Response.json({ data: serializeEvent(event) }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/family/events] DB 오류:", error);
    return Response.json({ error: "이벤트 생성에 실패했습니다" }, { status: 500 });
  }
}
