import { NextResponse } from "next/server";
import { insertProjects } from "@/lib/insertProjects";
import { requireCronSecret } from "@/lib/auth";
import type { ParsedProject } from "@/lib/project-types";
import { fetchAllCategoriesProjects } from "@/lib/parser";
import { fetchWeblancerProjects } from "@/lib/parser-weblancer";
import { fetchFlRuProjects } from "@/lib/parser-flru";
import { fetchFreelancerProjects } from "@/lib/parser-freelancer";

// Для App Router источник истины по длительности — export const maxDuration,
// vercel.json functions.maxDuration на отдельные роуты не всегда применяется.
export const maxDuration = 300;

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}

async function handleCron(req: Request) {
  const authError = requireCronSecret(req);
  if (authError) return authError;

  try {
    const allParsed: ParsedProject[] = [];

    const results = await Promise.allSettled([
      fetchAllCategoriesProjects(5).then((p) =>
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
      fetchFlRuProjects(),
      fetchFreelancerProjects(),
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
