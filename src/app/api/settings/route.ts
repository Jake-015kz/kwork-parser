import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  return NextResponse.json({ chatId, minBudget });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const ops: Promise<void>[] = [];
  if (body.chatId !== undefined) ops.push(setSetting("telegram_chat_id", body.chatId));
  if (body.minBudget !== undefined) ops.push(setSetting("min_budget", body.minBudget));
  await Promise.all(ops);

  return NextResponse.json({ ok: true });
}