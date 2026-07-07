import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, syncLogs } from "@/db/schema";
import { fetchAllCategoriesProjects } from "@/lib/parser";
import { analyzeOneProject } from "@/lib/analyzeOne";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const kworkProjects = await fetchAllCategoriesProjects(10);

    const existingIds = await db
      .select({ id: projects.kworkId })
      .from(projects);
    const existingSet = new Set(existingIds.map((p) => p.id));

    const inserted: typeof projects.$inferSelect[] = [];
    for (const kp of kworkProjects) {
      if (existingSet.has(kp.id)) continue;

      const [p] = await db
        .insert(projects)
        .values({
          kworkId: kp.id,
          categoryId: parseInt(kp.category_id),
          name: kp.name,
          description: kp.description || "",
          priceLimit: kp.priceLimit || null,
          maxDays: kp.max_days ? parseInt(kp.max_days) : null,
          userName: kp.user?.username || null,
          userRating: null,
          userHiredPercent: kp.user?.data?.wants_hired_percent
            ? parseInt(kp.user.data.wants_hired_percent)
            : null,
          userWantsCount: kp.user?.data?.wants_count
            ? parseInt(kp.user.data.wants_count)
            : null,
          userBadges: kp.user?.badges?.map((b) => b.badge?.title) || [],
          url: `https://kwork.ru/projects/${kp.id}/view`,
          viewsCount: kp.views_dirty ? parseInt(kp.views_dirty) : null,
          dateCreate: kp.date_create ? new Date(kp.date_create) : null,
          dateActive: kp.date_active ? new Date(kp.date_active) : null,
          dateExpire: kp.date_expire ? new Date(kp.date_expire) : null,
          timeLeft: kp.timeLeft || null,
          status: "new",
        })
        .returning();

      inserted.push(p);
    }

    let analyzed = 0;
    let analyzeErrors = 0;
    for (const p of inserted) {
      try {
        await analyzeOneProject(p);
        analyzed++;
      } catch (err) {
        analyzeErrors++;
        await db
          .update(projects)
          .set({ status: "error", updatedAt: new Date() })
          .where(eq(projects.id, p.id));
      }
    }

    await db.insert(syncLogs).values({
      type: "manual",
      status: "success",
      projectsFound: kworkProjects.length,
      projectsNew: inserted.length,
      projectsAnalyzed: analyzed,
      message: analyzeErrors > 0 ? `analyze errors: ${analyzeErrors}` : undefined,
    });

    return NextResponse.json({
      ok: true,
      found: kworkProjects.length,
      new: inserted.length,
      analyzed,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
