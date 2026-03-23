import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { upsertEmotionSchema } from "@/lib/validations/emotion";
import { todayKST } from "@/lib/utils";
import { EmotionCheckin } from "@prisma/client";

// ============================================================================
// BigInt JSON 직렬화 헬퍼
// ============================================================================

type EmotionSerialized = Omit<EmotionCheckin, "id" | "userId" | "checkinDate" | "sleepHours"> & {
  id: string;
  userId: string;
  checkinDate: string;
  sleepHours: number | null;
};

function serializeEmotion(emotion: EmotionCheckin): EmotionSerialized {
  return {
    ...emotion,
    id: emotion.id.toString(),
    userId: emotion.userId.toString(),
    checkinDate: emotion.checkinDate instanceof Date
      ? emotion.checkinDate.toISOString().split("T")[0]
      : String(emotion.checkinDate),
    sleepHours: emotion.sleepHours !== null ? Number(emotion.sleepHours) : null,
  };
}

// ============================================================================
// GET /api/emotion?date=YYYY-MM-DD
// 날짜별 감정 체크인 조회
// ============================================================================

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  const targetDate = dateParam
    ? new Date(dateParam)
    : new Date(todayKST());

  if (isNaN(targetDate.getTime())) {
    return Response.json({ error: "유효하지 않은 날짜 형식입니다" }, { status: 400 });
  }

  const userId = BigInt(session.user.id);

  const emotion = await prisma.emotionCheckin.findUnique({
    where: { userId_checkinDate: { userId, checkinDate: targetDate } },
  });

  return Response.json({ data: emotion ? serializeEmotion(emotion) : null });
}

// ============================================================================
// POST /api/emotion
// 감정 체크인 upsert
// ============================================================================

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = upsertEmotionSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { date, primaryEmotion, emotionScore, physicalCondition, sleepQuality, sleepHours, exerciseMinutes, notes, isPublished } = parsed.data;
  const userId = BigInt(session.user.id);
  const checkinDate = new Date(date);

  const emotion = await prisma.emotionCheckin.upsert({
    where: { userId_checkinDate: { userId, checkinDate } },
    create: {
      userId,
      checkinDate,
      primaryEmotion,
      emotionScore,
      physicalCondition,
      sleepQuality,
      sleepHours,
      exerciseMinutes,
      notes,
      isPublished: isPublished ?? true,
    },
    update: {
      primaryEmotion,
      emotionScore,
      physicalCondition,
      sleepQuality,
      sleepHours,
      exerciseMinutes,
      notes,
      isPublished,
    },
  });

  return Response.json({ data: serializeEmotion(emotion) }, { status: 201 });
}
