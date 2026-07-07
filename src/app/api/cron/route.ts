import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, syncLogs } from "@/db/schema";
import { fetchAllCategoriesProjects } from "@/lib/parser";
import { analyzeOneProject } from "@/lib/analyzeOne";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const log: string[] = [];
  let newCount = 0;
  let analyzedCount = 0;
  let backlogCount = 0;

  try {
    log.push("Starting cron parse...");

    const kworkProjects = await fetchAllCategoriesProjects(10);
    log.push(`Found ${kworkProjects.length} projects from kwork`);

    const existingIds = await db
      .select({ id: projects.kworkId })
      .from(projects);
    const existingSet = new Set(existingIds.map((p) => p.id));

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

      newCount++;
      analyzedCount++;

      try {
        await analyzeOneProject(p);
      } catch (err) {
        log.push(`Analysis error for project ${kp.id}: ${err}`);
        await db
          .update(projects)
          .set({ status: "error", updatedAt: new Date() })
          .where(eq(projects.id, p.id));
      }
    }

    const backlog = await db
      .select()
      .from(projects)
      .where(eq(projects.status, "new"))
      .orderBy(asc(projects.createdAt))
      .limit(5);

    for (const p of backlog) {
      try {
        await analyzeOneProject(p);
        backlogCount++;
        analyzedCount++;
      } catch (err) {
        log.push(`Backlog analysis error for project ${p.id}: ${err}`);
        await db
          .update(projects)
          .set({ status: "error", updatedAt: new Date() })
          .where(eq(projects.id, p.id));
      }
    }

    if (backlogCount > 0) log.push(`Analyzed ${backlogCount} from backlog`);

    await db.insert(syncLogs).values({
      type: "cron",
      status: "success",
      projectsFound: kworkProjects.length,
      projectsNew: newCount,
      projectsAnalyzed: analyzedCount,
      message: log.join("\n"),
    });

    return NextResponse.json({
      ok: true,
      found: kworkProjects.length,
      new: newCount,
      analyzed: analyzedCount,
      backlog: backlogCount,
    });
  } catch (err) {
    const errorMsg = String((err as any)?.cause ?? err);
    await db.insert(syncLogs).values({
      type: "cron",
      status: "error",
      message: errorMsg,
    });

    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
