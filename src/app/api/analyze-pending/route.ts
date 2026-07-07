import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/db/schema";
import { analyzeOneProject } from "@/lib/analyzeOne";
import { sql, eq, asc, or } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { limit = 10 } = await req.json().catch(() => ({}));
    const batchSize = Math.min(Math.max(1, limit), 30);

    const pending = await db
      .select()
      .from(projects)
      .where(or(eq(projects.status, "new"), eq(projects.status, "error")))
      .orderBy(asc(projects.createdAt))
      .limit(batchSize);

    let analyzed = 0;
    let errors = 0;

    for (const p of pending) {
      try {
        await analyzeOneProject(p);
        analyzed++;
      } catch (err) {
        errors++;
        await db
          .update(projects)
          .set({ status: "error", updatedAt: new Date() })
          .where(eq(projects.id, p.id));
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(eq(projects.status, "new"));

    return NextResponse.json({
      ok: true,
      analyzed,
      errors,
      remaining: row.count,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
