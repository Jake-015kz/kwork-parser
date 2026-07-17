import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, responses } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET() {
  const out: Record<string, unknown> = { v: "r7" };
  try {
    const items = await db
      .select({
        id: responses.id,
        projectId: responses.projectId,
        content: responses.content,
        status: responses.status,
        projectName: projects.name,
        kworkId: projects.kworkId,
        url: projects.url,
        platform: projects.platform,
      })
      .from(responses)
      .innerJoin(projects, eq(responses.projectId, projects.id))
      .orderBy(desc(responses.createdAt));
    out.ok = true;
    out.count = items.length;
  } catch (e: any) {
    out.error = e?.message || String(e);
    out.detail = (e?.message || "").split("\nparams:")[0];
    out.cause = e?.cause?.message || null;
  }
  try {
    const c = await db.execute(sql`SELECT count(*)::int AS n FROM responses`);
    out.responsesCount = c;
  } catch (e: any) {
    out.countError = e?.message;
  }
  try {
    const c = await db.execute(sql`SELECT 1 FROM responses LIMIT 1`);
    out.sampleOk = true;
  } catch (e: any) {
    out.sampleError = e?.message;
  }
  return NextResponse.json(out);
}
