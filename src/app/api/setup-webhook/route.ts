import { NextResponse } from "next/server";
import { requireAdminToken } from "@/lib/auth";

export async function POST(req: Request) {
  const authError = requireAdminToken(req);
  if (authError) return authError;

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const WEBHOOK_URL = process.env.WEBHOOK_URL;

  if (!TOKEN || !WEBHOOK_URL) {
    return NextResponse.json(
      { ok: false, error: "Missing TELEGRAM_BOT_TOKEN or WEBHOOK_URL" },
      { status: 500 }
    );
  }

  const fullUrl = `${WEBHOOK_URL}/api/telegram/webhook`;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TOKEN}/setWebhook?url=${encodeURIComponent(fullUrl)}`,
      { method: "POST" }
    );
    const data = await res.json();

    const info = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
    const infoData = await info.json();

    return NextResponse.json({ ok: true, setWebhook: data, webhookInfo: infoData });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
