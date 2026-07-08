import { NextResponse } from "next/server";
import { handleTelegramWebhook } from "@/lib/telegram";

export async function POST(request: Request) {
  if (!handleTelegramWebhook) {
    return NextResponse.json({ error: "Telegram bot not configured" }, { status: 503 });
  }
  return handleTelegramWebhook(request);
}

export const runtime = "nodejs";
