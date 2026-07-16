import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blacklist } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const items = await db.select().from(blacklist)
    .orderBy(desc(blacklist.createdAt));

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const { userName, reason } = await req.json();

  const [existing] = await db.select().from(blacklist)
    .where(eq(blacklist.userName, userName)).limit(1);

  if (existing) {
    await db.update(blacklist)
      .set({ reason: reason || existing.reason, blockCount: (existing.blockCount || 0) + 1, autoBlocked: false })
      .where(eq(blacklist.id, existing.id));
    return NextResponse.json({ ok: true, updated: true });
  }

  const [item] = await db.insert(blacklist).values({
    userName,
    reason: reason || "",
    autoBlocked: false,
    blockCount: 1,
  }).returning();

  return NextResponse.json({ ok: true, item });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await db.delete(blacklist).where(eq(blacklist.id, id));
  return NextResponse.json({ ok: true });
}