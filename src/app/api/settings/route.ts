import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminToken } from "@/lib/auth";
import { parseBody, settingsPostSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

async function getSetting(key: string): Promise<string | null> {
  const [s] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return s ? String(s.value) : null;
}

async function setSetting(key: string, value: string) {
  const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (existing.length) {
    await db.update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value });
  }
}

export async function GET() {
  const [chatId, minBudget] = await Promise.all([
    getSetting("telegram_chat_id"),
    getSetting("min_budget"),
  ]);

  return NextResponse.json({
    chatId,
    minBudget,
    model: process.env.AI_MODEL || "qwen/qwen3-32b",
  });
}

export async function POST(req: NextRequest) {
  const authError = requireAdminToken(req);
  if (authError) return authError;

  const parsed = await parseBody(req, settingsPostSchema);
  if (!parsed.ok) return parsed.error;

  const { chatId, minBudget } = parsed.data;

  try {
    const ops: Promise<void>[] = [];
    if (chatId !== undefined) ops.push(setSetting("telegram_chat_id", chatId));
    if (minBudget !== undefined) ops.push(setSetting("min_budget", minBudget));
    await Promise.all(ops);

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("settings:POST", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}