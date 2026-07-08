import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, analyses } from "@/db/schema";
import { analyzeProject } from "@/lib/ai";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return NextResponse.json({ error: "project not found" }, { status: 404 });
    }

    const result = await analyzeProject(
      project.name,
      project.description,
      project.priceLimit,
      project.maxDays,
      project.userName,
      (project.userBadges as string[]) || [],
      project.userHiredPercent,
      project.userWantsCount
    );

    await db.insert(analyses).values({
      projectId: project.id,
      verdict: result.verdict,
      score: result.score,
      reasoning: result.reasoning,
      responseText: result.response?.body || null,
      modelUsed: process.env.AI_MODEL || "deepseek/deepseek-chat-v3-0324:free",
    });

    await db
      .update(projects)
      .set({ status: "analyzed", updatedAt: new Date() })
      .where(eq(projects.id, project.id));

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
