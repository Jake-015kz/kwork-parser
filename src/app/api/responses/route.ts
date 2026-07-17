import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { responses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminToken } from "@/lib/auth";
import { getResponses, getResponseForProject } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status") ?? undefined;

  try {
    if (projectId) {
      const pid = Number(projectId);
      if (isNaN(pid)) {
        return NextResponse.json({ error: "invalid projectId" }, { status: 400 });
      }
      const result = await getResponseForProject(pid);
      if (!result) {
        return NextResponse.json({ error: "No response generated" }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    const items = await getResponses(status);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Failed to fetch responses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authError = requireAdminToken(req);
  if (authError) return authError;

  const body = await req.json();
  const { projectId, content, status: newStatus } = body;

  if (!projectId || !content) {
    return NextResponse.json({ error: "projectId and content required" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(responses)
    .where(eq(responses.projectId, projectId))
    .limit(1);

  if (existing) {
    await db
      .update(responses)
      .set({
        content,
        status: newStatus || "queued",
        sent: false,
        sentAt: null,
        viewedAt: null,
        respondedAt: null,
        rejectedAt: null,
        rejectReason: null,
      })
      .where(eq(responses.id, existing.id));
  } else {
    await db.insert(responses).values({
      projectId,
      content,
      status: newStatus || "queued",
      sent: false,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const authError = requireAdminToken(req);
  if (authError) return authError;

  const body = await req.json();
  const { id, status: newStatus, kworkOfferId, rejectReason } = body;

  if (!id || !newStatus) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { status: newStatus };

  if (newStatus === "submitted") {
    updateData.sent = true;
    updateData.sentAt = new Date();
  } else if (newStatus === "viewed") {
    updateData.viewedAt = new Date();
  } else if (newStatus === "responded") {
    updateData.respondedAt = new Date();
  } else if (newStatus === "rejected") {
    updateData.rejectedAt = new Date();
    updateData.rejectReason = rejectReason || null;
  }

  if (kworkOfferId) {
    updateData.kworkOfferId = kworkOfferId;
  }

  await db.update(responses).set(updateData).where(eq(responses.id, id));
  return NextResponse.json({ ok: true });
}
