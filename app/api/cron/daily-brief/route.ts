import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDailyBriefMessage } from "@/lib/notifications/daily-brief";
import { sendTelegramMessage } from "@/lib/telegram";

/**
 * POST /api/cron/daily-brief
 * Windows 작업 스케줄러 또는 외부 cron에서 호출.
 * Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  // 인증 검증
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { name: string; status: string; error?: string }[] = [];

  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        profile: {
          telegramChatId: { not: null },
          telegramBotToken: { not: null },
        },
      },
      include: { profile: true },
    });

    for (const user of users) {
      const profile = user.profile;
      if (!profile?.telegramBotToken || !profile?.telegramChatId) continue;

      try {
        const message = await buildDailyBriefMessage(
          user.id,
          user.familyId,
          user.name,
          {
            notifyPlans: profile.telegramNotifyPlans,
            notifyEvents: profile.telegramNotifyEvents,
            notifyIncomplete: profile.telegramNotifyIncomplete,
          }
        );
        await sendTelegramMessage(
          profile.telegramBotToken,
          profile.telegramChatId,
          message
        );
        results.push({ name: user.name, status: "sent" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ name: user.name, status: "failed", error: msg });
      }
    }

    return Response.json({ ok: true, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
