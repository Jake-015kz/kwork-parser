import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, responses } from "@/db/schema";
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

    if (!result.response) {
      return NextResponse.json(
        { error: "AI решил что проект не подходит для отклика" },
        { status: 400 }
      );
    }

    await db.insert(responses).values({
      projectId: project.id,
      content: result.response.body,
    });

    return NextResponse.json(result.response);
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
