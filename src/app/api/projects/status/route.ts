import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";

const VALID_STATUSES = ["new", "analyzed", "responded", "skipped", "error", "pending", "failed"];

export async function PATCH(req: NextRequest) {
  const { id, status, skipReason } = await req.json();

  if (!id || typeof id !== "number") {
    return NextResponse.json({ ok: false, error: "id required (number)" }, { status: 400 });
  }

  if (!status || typeof status !== "string") {
    return NextResponse.json({ ok: false, error: "status required (string)" }, { status: 400 });
  }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { ok: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (status === "skipped" && skipReason && typeof skipReason !== "string") {
    return NextResponse.json({ ok: false, error: "skipReason must be a string" }, { status: 400 });
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
