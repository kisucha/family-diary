import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildDailyBriefMessage } from "@/lib/notifications/daily-brief";
import { sendTelegramMessage } from "@/lib/telegram";

// POST /api/notifications/test
// 인증된 사용자에게 즉시 텔레그램 테스트 메시지 발송
// body: { botToken?: string; chatId?: string } — 미전달 시 DB 저장값 사용
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const userId = BigInt(session.user.id);

  // 요청 body에서 botToken/chatId 추출 (폼에서 직접 전달)
  let bodyBotToken: string | undefined;
  let bodyChatId: string | undefined;
  let bodyNotifyPlans: boolean | undefined;
  let bodyNotifyEvents: boolean | undefined;
  let bodyNotifyIncomplete: boolean | undefined;
  try {
    const body = await request.json();
    bodyBotToken = body?.botToken || undefined;
    bodyChatId = body?.chatId || undefined;
    bodyNotifyPlans = body?.notifyPlans;
    bodyNotifyEvents = body?.notifyEvents;
    bodyNotifyIncomplete = body?.notifyIncomplete;
  } catch {
    // body 없으면 DB 값 사용
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    return Response.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
  }

  // body 값 우선, 없으면 DB 저장값 사용
  const botToken = bodyBotToken ?? user.profile?.telegramBotToken ?? null;
  const chatId = bodyChatId ?? user.profile?.telegramChatId ?? null;

  if (!botToken || !chatId) {
    return Response.json(
      { error: "텔레그램 Bot Token과 Chat ID를 먼저 입력해주세요" },
      { status: 400 }
    );
  }

  try {
    const message = await buildDailyBriefMessage(
      user.id,
      user.familyId,
      user.name,
      {
        notifyPlans: bodyNotifyPlans ?? user.profile?.telegramNotifyPlans ?? true,
        notifyEvents: bodyNotifyEvents ?? user.profile?.telegramNotifyEvents ?? true,
        notifyIncomplete: bodyNotifyIncomplete ?? user.profile?.telegramNotifyIncomplete ?? true,
      }
    );
    await sendTelegramMessage(botToken, chatId, message);
    return Response.json({ message: "테스트 메시지가 발송되었습니다" });
  } catch (err) {
    console.error("[Telegram Test] 발송 오류:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "발송에 실패했습니다" },
      { status: 500 }
    );
  }
}
