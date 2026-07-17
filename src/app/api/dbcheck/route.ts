import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, analyses } from "@/db/schema";
import { eq, desc, sql, and, or, ilike, gte, lte } from "drizzle-orm";

export async function GET() {
  const out: Record<string, unknown> = {};
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
        kworkId: projects.kworkId,
        platform: projects.platform,
        platformId: projects.platformId,
        categoryId: projects.categoryId,
        name: projects.name,
        priceLimit: projects.priceLimit,
        maxDays: projects.maxDays,
        status: projects.status,
        userName: projects.userName,
        timeLeft: projects.timeLeft,
        skipReason: projects.skipReason,
        url: projects.url,
        createdAt: projects.createdAt,
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
    out.stack = (e?.stack || "").split("\n").slice(0, 8);
    out.cause = e?.cause?.message || null;
  }
  return NextResponse.json(out);
}
