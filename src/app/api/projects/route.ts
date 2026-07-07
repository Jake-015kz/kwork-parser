import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, analyses } from "@/db/schema";
import { eq, desc, sql, and, or, ilike, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const verdict = searchParams.get("verdict");
  const minBudget = searchParams.get("minBudget");
  const maxBudget = searchParams.get("maxBudget");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  const conditions: ReturnType<typeof eq>[] = [];
  if (status && status !== "all") {
    conditions.push(eq(projects.status, status));
  }
  if (search) {
    conditions.push(
      or(
        ilike(projects.name, `%${search}%`),
        ilike(projects.description, `%${search}%`)
      )! as any
    );
  }
  if (verdict && verdict !== "all") {
    conditions.push(eq(analyses.verdict, verdict));
  }
  if (minBudget) {
    conditions.push(gte(sql`CAST(NULLIF(${projects.priceLimit}, '') AS NUMERIC)`, parseFloat(minBudget)) as any);
  }
  if (maxBudget) {
    conditions.push(lte(sql`CAST(NULLIF(${projects.priceLimit}, '') AS NUMERIC)`, parseFloat(maxBudget)) as any);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: projects.id,
        kworkId: projects.kworkId,
        categoryId: projects.categoryId,
        name: projects.name,
        priceLimit: projects.priceLimit,
        maxDays: projects.maxDays,
        status: projects.status,
        userName: projects.userName,
        timeLeft: projects.timeLeft,
        skipReason: projects.skipReason,
        createdAt: projects.createdAt,
        analysis: {
          verdict: analyses.verdict,
          score: analyses.score,
          responseCost: analyses.responseCost,
        },
      })
      .from(projects)
      .leftJoin(analyses, eq(analyses.projectId, projects.id))
      .where(where)
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .leftJoin(analyses, eq(analyses.projectId, projects.id))
      .where(where),
  ]);

  return NextResponse.json({
    items,
    total: Number(totalResult[0]?.count || 0),
    limit,
    offset,
  });
}