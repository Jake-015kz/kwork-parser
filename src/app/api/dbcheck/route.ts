import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, analyses } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";

export async function GET() {
  const out: Record<string, unknown> = { v: "r3" };
  try {
    const conditions: ReturnType<typeof eq>[] = [];

    const latestAnalysis = db
      .selectDistinctOn([analyses.projectId], {
        projectId: analyses.projectId,
        verdict: analyses.verdict,
        score: analyses.score,
        responseCost: analyses.responseCost,
        responseText: analyses.responseText,
      })
      .from(analyses)
      .orderBy(desc(analyses.projectId), desc(analyses.id))
      .as("latest_analysis");

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db
      .select({
        id: projects.id,
        platform: projects.platform,
        priceLimit: projects.priceLimit,
        status: projects.status,
        userName: projects.userName,
        hasContact: sql<boolean>`CASE WHEN ${projects.description} ~* '@[\\wа-я]{3,}|t\\.me/|[\\w.+-]+@[\\w.-]+\\.[\\w]{2,}|whatsapp|ва?тсап|(\\+7|8)[\\s-]?\\(?\\d{3}\\)?[\\s-]?\\d{3}[\\s-]?\\d{2}[\\s-]?\\d{2}' THEN true ELSE false END`,
        analysis: {
          verdict: latestAnalysis.verdict,
          score: latestAnalysis.score,
          responseCost: latestAnalysis.responseCost,
          responseText: latestAnalysis.responseText,
        },
      })
      .from(projects)
      .leftJoin(latestAnalysis, eq(latestAnalysis.projectId, projects.id))
      .where(where)
      .orderBy(desc(projects.createdAt))
      .limit(2);

    out.ok = true;
    out.count = items.length;
  } catch (e: any) {
    out.error = e?.message || String(e);
    out.stack = (e?.stack || "").split("\n").slice(0, 10);
    out.cause = e?.cause?.message || null;
  }
  return NextResponse.json(out);
}
