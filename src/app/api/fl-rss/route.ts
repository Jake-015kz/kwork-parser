import { NextResponse } from "next/server";
import { fetchFlRssProjects } from "@/lib/parser-fl-rss";
import { db } from "@/lib/db";
import { projects } from "@/db/schema";
import { analyzeOneProject } from "@/lib/analyzeOne";
import { eq } from "drizzle-orm";

export async function POST() {
  const errors: string[] = [];
  let newCount = 0;
  let analyzedCount = 0;

  try {
    const parsed = await fetchFlRssProjects();

    const existingIds = await db
      .select({ platformId: projects.platformId })
      .from(projects);
    const existingSet = new Set(existingIds.map((p) => p.platformId));

    for (const p of parsed) {
      if (existingSet.has(p.platformId)) continue;

      try {
        const [inserted] = await db
          .insert(projects)
          .values({
            platformId: p.platformId,
            platform: p.platform,
            kworkId: 0,
            categoryId: p.categoryId,
            name: p.name,
            description: p.description,
            priceLimit: p.budget,
            maxDays: null,
            userName: null,
            userRating: null,
            userHiredPercent: null,
            userWantsCount: null,
            userBadges: [],
            url: p.url,
            viewsCount: null,
            dateCreate: p.dateCreate ? new Date(p.dateCreate) : null,
            status: "new",
          })
          .returning();

        newCount++;

        try {
          await analyzeOneProject(inserted);
          analyzedCount++;
        } catch (err) {
          errors.push(`Analysis error for ${p.platformId}: ${err}`);
          await db
            .update(projects)
            .set({ status: "error", updatedAt: new Date() })
            .where(eq(projects.id, inserted.id));
        }

        await new Promise((r) => setTimeout(r, 2000));
      } catch {
        existingSet.add(p.platformId);
      }
    }

    return NextResponse.json({
      ok: true,
      found: parsed.length,
      new: newCount,
      analyzed: analyzedCount,
      errors,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
