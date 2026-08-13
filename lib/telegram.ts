export type TelegramResult = { ok: true } | { ok: false; error: string };

export async function sendTelegramMessage(token: string, chatId: string, text: string): Promise<TelegramResult> {
  if (!token || !chatId) return { ok: false, error: "Chưa cấu hình Bot Token hoặc Chat ID Telegram." };

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      cache: "no-store",
    });
    const body = await response.json() as { ok?: boolean; description?: string };
    return body.ok ? { ok: true } : { ok: false, error: body.description ?? "Telegram từ chối gửi tin nhắn." };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Không thể kết nối Telegram." };
  }
}
