import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, analyses, responses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const analysisList = await db
    .select()
    .from(analyses)
    .where(eq(analyses.projectId, projectId));

  const responseList = await db
    .select()
    .from(responses)
    .where(eq(responses.projectId, projectId));

  return NextResponse.json({
    ...project,
    analyses: analysisList,
    responses: responseList,
  });
}
