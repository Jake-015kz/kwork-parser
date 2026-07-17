import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, analyses } from "@/db/schema";
import { desc, sql, eq } from "drizzle-orm";

export async function GET() {
  const out: Record<string, unknown> = {};

  // 1) простой count (как в stats)
  try {
    const r = await db.execute(sql`SELECT count(*)::int AS n FROM projects`);
    out.simpleCount = r;
  } catch (e) {
    out.simpleCountError = String(e);
  }

  // 2) regex-фильтр hasContact (как в projects + stats)
  try {
    const r = await db.execute(sql`
      SELECT count(*)::int AS n FROM projects
      WHERE ${projects.description} ~* '@[\\wа-я]{3,}|t\\.me/|[\\w.+-]+@[\\w.-]+\\.[\\w]{2,}|whatsapp|ва?тсап|(\\+7|8)[\\s-]?\\(?\\d{3}\\)?[\\s-]?\\d{3}[\\s-]?\\d{2}[\\s-]?\\d{2}'
    `);
    out.regexCount = r;
  } catch (e) {
    out.regexError = String(e);
  }

  // 3) distinct on subquery (как в /api/projects)
  try {
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

    const items = await db
      .select({
        id: projects.id,
        name: projects.name,
        analysis: { verdict: latestAnalysis.verdict },
      })
      .from(projects)
      .leftJoin(latestAnalysis, eq(latestAnalysis.projectId, projects.id))
      .limit(2);
    out.distinctOn = items.length;
  } catch (e) {
    out.distinctOnError = String(e);
  }

  return NextResponse.json(out);
}
