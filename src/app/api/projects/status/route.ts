import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  const { id, status, skipReason } = await req.json();

  if (!id || !status) {
    return NextResponse.json({ ok: false, error: "id and status required" }, { status: 400 });
  }

  await db.update(projects)
    .set({
      status,
      ...(skipReason ? { skipReason } : {}),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id));

  return NextResponse.json({ ok: true });
}