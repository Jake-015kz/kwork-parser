import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, analyses } from "@/db/schema";
import { eq, desc, sql, and, or, ilike, gte, lte } from "drizzle-orm";

export async function GET(req: Request) {
  const out: Record<string, unknown> = { v: "r4" };
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const verdict = searchParams.get("verdict");
    const minBudget = searchParams.get("minBudget");
    const maxBudget = searchParams.get("maxBudget");

    const conditions: ReturnType<typeof eq>[] = [];
    if (status && status !== "all" && status !== "recommended") {
      conditions.push(eq(projects.status, status));
    }
    if (searchParams.get("search")) {
      conditions.push(or(ilike(projects.name, `%x%`))! as ReturnType<typeof eq>);
    }
    if (minBudget) {
      conditions.push(gte(sql`CAST(NULLIF(${projects.priceLimit}, '') AS NUMERIC)`, parseFloat(minBudget)) as ReturnType<typeof eq>);
    }
    if (maxBudget) {
      conditions.push(lte(sql`CAST(NULLIF(${projects.priceLimit}, '') AS NUMERIC)`, parseFloat(maxBudget)) as ReturnType<typeof eq>);
    }

    const latestAnalysis = db
      .selectDistinctOn([analyses.projectId], {
        projectId: analyses.projectId,
        verdict: analyses.verdict,
        score: analyses.score,
        responseCost: analyses.responseCost,
        responseText: analyses.responseText,
      })
      .from(analyses)
      .where(verdict && verdict !== "all" ? eq(analyses.verdict, verdict) : undefined)
      .orderBy(desc(analyses.projectId), desc(analyses.id))
      .as("latest_analysis");

    if (verdict && verdict !== "all") {
      conditions.push(sql`${latestAnalysis.projectId} IS NOT NULL` as ReturnType<typeof eq>);
    }
    if (status === "recommended") {
      conditions.push(sql`${latestAnalysis.score} >= 8` as ReturnType<typeof eq>);
      conditions.push(sql`${latestAnalysis.projectId} IS NOT NULL` as ReturnType<typeof eq>);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, totalResult] = await Promise.all([
      db
        .select({
          id: projects.id,
          name: projects.name,
          priceLimit: projects.priceLimit,
          hasContact: sql<boolean>`CASE WHEN ${projects.description} ~* '@[\\wа-я]{3,}|t\\.me/|[\\w.+-]+@[\\w.-]+\\.[\\w]{2,}|whatsapp|ва?тсап|(\\+7|8)[\\s-]?\\(?\\d{3}\\)?[\\s-]?\\d{3}[\\s-]?\\d{2}[\\s-]?\\d{2}' THEN true ELSE false END`,
          analysis: { verdict: latestAnalysis.verdict, score: latestAnalysis.score },
        })
        .from(projects)
        .leftJoin(latestAnalysis, eq(latestAnalysis.projectId, projects.id))
        .where(where)
        .orderBy(desc(projects.createdAt))
        .limit(2),
      db
        .select({ count: sql<number>`COUNT(DISTINCT ${projects.id})` })
        .from(projects)
        .leftJoin(latestAnalysis, eq(latestAnalysis.projectId, projects.id))
        .where(where),
    ]);

    out.ok = true;
    out.count = items.length;
    out.total = Number(totalResult[0]?.count || 0);
  } catch (e: any) {
    out.error = e?.message || String(e);
    out.stack = (e?.stack || "").split("\n").slice(0, 12);
    out.cause = e?.cause?.message || null;
  }
  return NextResponse.json(out);
}
