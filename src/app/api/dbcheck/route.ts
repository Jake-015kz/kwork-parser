import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, analyses, responses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const out: Record<string, unknown> = { v: "pd" };
  const id = Number(new URL(req.url).searchParams.get("id") || "1");
  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    out.project = project ? { id: project.id, name: project.name } : null;
  } catch (e: any) {
    out.projectError = e?.message?.split("\n")[0];
  }
  try {
    const a = await db.select().from(analyses).where(eq(analyses.projectId, id));
    out.analyses = a.length;
  } catch (e: any) {
    out.analysesError = e?.message?.split("\n")[0];
  }
  try {
    const r = await db.select().from(responses).where(eq(responses.projectId, id));
    out.responses = r.length;
  } catch (e: any) {
    out.responsesError = e?.message?.split("\n")[0];
  }
  return NextResponse.json(out);
}
