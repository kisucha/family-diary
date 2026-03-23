import https from "https";

/**
 * 텔레그램 Bot API를 통해 메시지를 발송한다.
 * node:https + family:4 로 IPv4만 사용 (undici happy-eyeballs ETIMEDOUT 방지)
 * @param botToken 사용자별 Bot Token
 * @param chatId 사용자별 Chat ID
 * @param text 발송할 메시지 (Markdown 형식)
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<void> {
  const body = JSON.stringify({
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  });

  await new Promise<void>((resolve, reject) => {
    const req = https.request(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        family: 4, // IPv4 only — undici ETIMEDOUT 방지
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Telegram API 오류 (${res.statusCode}): ${data}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
