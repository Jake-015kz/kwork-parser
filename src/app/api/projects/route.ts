import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, analyses } from "@/db/schema";
import { eq, desc, sql, and, or, ilike, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const verdict = searchParams.get("verdict");
    const platform = searchParams.get("platform");
    const minBudget = searchParams.get("minBudget");
    const maxBudget = searchParams.get("maxBudget");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const conditions: ReturnType<typeof eq>[] = [];
    if (status && status !== "all") {
      conditions.push(eq(projects.status, status));
    }
    if (platform && platform !== "all") {
      conditions.push(eq(projects.platform, platform));
    }
    if (search) {
      conditions.push(
        or(
          ilike(projects.name, `%${search}%`),
          ilike(projects.description, `%${search}%`)
        )! as ReturnType<typeof eq>
      );
    }
    if (minBudget) {
      conditions.push(gte(sql`CAST(NULLIF(${projects.priceLimit}, '') AS NUMERIC)`, parseFloat(minBudget)) as ReturnType<typeof eq>);
    }
    if (maxBudget) {
      conditions.push(lte(sql`CAST(NULLIF(${projects.priceLimit}, '') AS NUMERIC)`, parseFloat(maxBudget)) as ReturnType<typeof eq>);
    }

    // Subquery to get latest analysis per project using DISTINCT ON (PostgreSQL)
    const latestAnalysis = db
      .selectDistinctOn([analyses.projectId], {
        projectId: analyses.projectId,
        verdict: analyses.verdict,
        score: analyses.score,
        responseCost: analyses.responseCost,
      })
      .from(analyses)
      .where(verdict && verdict !== "all" ? eq(analyses.verdict, verdict) : undefined)
      .orderBy(desc(analyses.projectId), desc(analyses.id))
      .as("latest_analysis");

    // When verdict filter is active, only show projects that have a matching analysis
    if (verdict && verdict !== "all") {
      conditions.push(sql`${latestAnalysis.projectId} IS NOT NULL` as ReturnType<typeof eq>);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, totalResult] = await Promise.all([
      db
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
          analysis: {
            verdict: latestAnalysis.verdict,
            score: latestAnalysis.score,
            responseCost: latestAnalysis.responseCost,
          },
        })
        .from(projects)
        .leftJoin(latestAnalysis, eq(latestAnalysis.projectId, projects.id))
        .where(where)
        .orderBy(desc(projects.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`COUNT(DISTINCT ${projects.id})` })
        .from(projects)
        .leftJoin(latestAnalysis, eq(latestAnalysis.projectId, projects.id))
        .where(where),
    ]);

    return NextResponse.json({
      items,
      total: Number(totalResult[0]?.count || 0),
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}