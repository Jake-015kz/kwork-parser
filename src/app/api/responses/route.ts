import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, analyses, responses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdminToken } from "@/lib/auth";

export async function GET(req: Request) {
 try {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");

  if (projectId) {
    const [project] = await db.select().from(projects).where(eq(projects.id, Number(projectId))).limit(1);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const [analysis] = await db
      .select()
      .from(analyses)
      .where(eq(analyses.projectId, project.id))
      .orderBy(desc(analyses.createdAt))
      .limit(1);

    if (!analysis?.responseText) {
      return NextResponse.json({ error: "No response generated" }, { status: 404 });
    }

    return NextResponse.json({
      projectId: project.id,
      kworkId: project.kworkId,
      projectName: project.name,
      responseText: analysis.responseText,
      responseCost: analysis.responseCost,
      responseTimeline: analysis.responseTimeline,
      verdict: analysis.verdict,
      score: analysis.score,
      url: project.url,
      platform: project.platform,
    });
  }

  const whereClause = status ? eq(responses.status, status) : undefined;
  const items = await db
    .select({
      id: responses.id,
      projectId: responses.projectId,
      content: responses.content,
      status: responses.status,
      kworkOfferId: responses.kworkOfferId,
      sent: responses.sent,
      sentAt: responses.sentAt,
      viewedAt: responses.viewedAt,
      respondedAt: responses.respondedAt,
      rejectedAt: responses.rejectedAt,
      rejectReason: responses.rejectReason,
      createdAt: responses.createdAt,
      projectName: projects.name,
      kworkId: projects.kworkId,
      url: projects.url,
      platform: projects.platform,
    })
    .from(responses)
    .innerJoin(projects, eq(responses.projectId, projects.id))
    .where(whereClause)
    .orderBy(desc(responses.createdAt));

  return NextResponse.json({ items });
 } catch (error: any) {
  console.error("responses error:", error);
  return NextResponse.json(
    { error: "Internal server error", v: "r6", detail: error?.message || String(error), stack: (error?.stack || "").split("\n").slice(0, 8) },
    { status: 500 }
  );
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
    await db.update(responses)
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
