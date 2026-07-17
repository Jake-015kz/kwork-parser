import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/db/schema";
import { inArray, asc, eq } from "drizzle-orm";
import { analyzeOneProject } from "@/lib/analyzeOne";
import { requireCronSecret } from "@/lib/auth";

const BATCH_SIZE = 5;
const DELAY_MS = 2000;

export const maxDuration = 300;

export async function POST(req: Request) {
  const authError = requireCronSecret(req);
  if (authError) return authError;

  try {
    const backlog = await db
      .select()
      .from(projects)
      .where(inArray(projects.status, ["new", "error"]))
      .orderBy(asc(projects.createdAt))
      .limit(BATCH_SIZE);

    if (backlog.length === 0) {
      return NextResponse.json({ ok: true, message: "Nothing to analyze", analyzed: 0 });
    }

    let analyzed = 0;
    const errors: string[] = [];

    for (const p of backlog) {
      try {
        await analyzeOneProject(p);
        analyzed++;
      } catch (err) {
        const msg = String(err);
        errors.push(`#${p.kworkId}: ${msg.slice(0, 200)}`);
        const [current] = await db
          .select({ status: projects.status })
          .from(projects)
          .where(eq(projects.id, p.id));
        if (current && current.status === "new") {
          await db
            .update(projects)
            .set({ status: "error", updatedAt: new Date() })
            .where(eq(projects.id, p.id));
        }
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    const remaining = await db
      .select({ count: projects.id })
      .from(projects)
      .where(inArray(projects.status, ["new", "error"]));

    return NextResponse.json({
      ok: true,
      analyzed,
      batch: backlog.length,
      remaining: remaining.length,
      errors,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
