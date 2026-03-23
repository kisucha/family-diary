export async function register() {
  // Node.js 런타임에서만 실행 (Edge 런타임 제외)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { default: cron } = await import("node-cron");
  const { prisma } = await import("@/lib/prisma");
  const { buildDailyBriefMessage } = await import(
    "@/lib/notifications/daily-brief"
  );
  const { sendTelegramMessage } = await import("@/lib/telegram");

  const appTz = process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Pacific/Auckland";

  // 매일 오전 8시 (APP_TIMEZONE 기준)
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log("[Telegram] 일일 브리핑 발송 시작...");

      try {
        // telegram 정보가 설정된 활성 사용자 조회
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
            console.log(`[Telegram] ${user.name}(${user.id}) 발송 완료`);
          } catch (err) {
            console.error(`[Telegram] ${user.name}(${user.id}) 발송 실패:`, err);
          }
        }

        console.log("[Telegram] 일일 브리핑 발송 완료");
      } catch (err) {
        console.error("[Telegram] 스케줄러 오류:", err);
      }
    },
    { timezone: appTz }
  );

  console.log(`[Telegram] 일일 브리핑 스케줄러 등록됨 (매일 08:00 ${appTz})`);
}
