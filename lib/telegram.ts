/**
 * 텔레그램 Bot API를 통해 메시지를 발송한다.
 * @param botToken 사용자별 Bot Token
 * @param chatId 사용자별 Chat ID
 * @param text 발송할 메시지 (Markdown 형식)
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Telegram API 오류 (${res.status}): ${errText}`);
  }
}
