import { NextResponse } from "next/server";
import { insertProjects } from "@/lib/insertProjects";
import type { ParsedProject } from "@/lib/project-types";

export const maxDuration = 30;

export async function GET() {
  return handleCron();
}

export async function POST() {
  return handleCron();
}

async function handleCron() {
  try {
    const { fetchAllCategoriesProjects } = await import("@/lib/parser");
    const { fetchWeblancerProjects } = await import("@/lib/parser-weblancer");

    const allParsed: ParsedProject[] = [];

    const results = await Promise.allSettled([
      fetchAllCategoriesProjects(3).then((p) =>
        p.map((kp) => ({
          platformId: `kwork_${kp.id}`,
          platform: "kwork" as const,
          categoryId: parseInt(kp.category_id),
          name: kp.name,
          description: kp.description || "",
          budget: kp.priceLimit || null,
          maxDays: kp.max_days ? parseInt(kp.max_days) : null,
          userName: kp.user?.username || null,
          userRating: null,
          userHiredPercent: kp.user?.data?.wants_hired_percent ? parseInt(kp.user.data.wants_hired_percent) : null,
          userWantsCount: kp.user?.data?.wants_count ? parseInt(kp.user.data.wants_count) : null,
          userBadges: kp.user?.badges?.map((b: { badge?: { title?: string } }) => b.badge?.title || "") || [],
          url: `https://kwork.ru/projects/${kp.id}/view`,
          viewsCount: kp.views_dirty ? parseInt(kp.views_dirty) : null,
          dateCreate: kp.date_create || null,
        }))
      ),
      fetchWeblancerProjects(),
    ]);

    for (const r of results) {
      if (r.status === "fulfilled") {
        allParsed.push(...r.value);
      }
    }

    if (allParsed.length === 0) {
      return NextResponse.json({ ok: true, found: 0, new: 0 });
    }

    const result = await insertProjects(allParsed, { analyze: true });

    return NextResponse.json({
      ok: true,
      found: allParsed.length,
      new: result.newCount,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
