import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { responses } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const items = await db
    .select()
    .from(responses)
    .orderBy(desc(responses.createdAt))
    .limit(100);

  return NextResponse.json({ items });
}
