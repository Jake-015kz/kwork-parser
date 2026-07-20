import { db } from "./db";
import { projects, syncLogs } from "@/db/schema";
import { fetchAllCategoriesProjects, type KworkProject } from "./parser";
import { fetchWeblancerProjects } from "./parser-weblancer";
import { fetchFlRuProjects } from "./parser-flru";
import { fetchFreelancerProjects } from "./parser-freelancer";
import { analyzeOneProject } from "./analyzeOne";
import { eq, inArray } from "drizzle-orm";
import { insertProjects } from "./insertProjects";
import type { ParsedProject } from "./project-types";

const ANALYSIS_DELAY_MS = 2000;

export interface ParseResult {
  ok: boolean;
  found: number;
  new: number;
  analyzed: number;
  backlog: number;
  errors: string[];
}

function kworkToParsed(kp: KworkProject): ParsedProject {
  return {
    platformId: `kwork_${kp.id}`,
    platform: "kwork",
    categoryId: parseInt(kp.category_id),
    name: kp.name,
    description: kp.description || "",
    budget: kp.priceLimit || null,
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
    dateCreate: kp.date_create || null,
  };
}

export async function runParseAndAnalyze(maxPages: number = 10): Promise<ParseResult> {
  const errors: string[] = [];
  let newCount = 0;
  let analyzedCount = 0;
  let backlogCount = 0;

  let kworkProjects: KworkProject[] = [];
  try {
    kworkProjects = await fetchAllCategoriesProjects(maxPages);
  } catch (err) {
    errors.push(`Kwork fetch error: ${err}`);
  }

  let weblancerProjects: ParsedProject[] = [];
  try {
    weblancerProjects = await fetchWeblancerProjects();
  } catch (err) {
    errors.push(`Weblancer fetch error: ${err}`);
  }

  let flruProjects: ParsedProject[] = [];
  try {
    flruProjects = await fetchFlRuProjects();
  } catch (err) {
    errors.push(`FL.ru fetch error: ${err}`);
  }

  let freelancerProjects: ParsedProject[] = [];
  try {
    freelancerProjects = await fetchFreelancerProjects();
  } catch (err) {
    errors.push(`Freelancer fetch error: ${err}`);
  }

  const allParsed: ParsedProject[] = [
    ...kworkProjects.map(kworkToParsed),
    ...weblancerProjects,
    ...flruProjects,
    ...freelancerProjects,
  ];

  const result = await insertProjects(allParsed);
  newCount = result.newCount;
  analyzedCount = result.analyzedCount;
  errors.push(...result.errors);

  const backlog = await db
    .select()
    .from(projects)
    .where(inArray(projects.status, ["new", "error"]))
    .orderBy(projects.createdAt);

  for (const p of backlog) {
    try {
      await analyzeOneProject(p);
      backlogCount++;
      analyzedCount++;
    } catch (err) {
      // analyzeOneProject ставит skipped/blacklisted при ожидаемом пропуске
      // и бросает Error — не перезаписываем на "error" в этом случае.
      const [cur] = await db.select({ status: projects.status }).from(projects).where(eq(projects.id, p.id));
      if (cur && cur.status !== "skipped" && cur.status !== "blacklisted") {
        errors.push(`Backlog analysis error for project ${p.id}: ${err}`);
        await db.update(projects).set({ status: "error", updatedAt: new Date() }).where(eq(projects.id, p.id));
      }
    }

    await new Promise((r) => setTimeout(r, ANALYSIS_DELAY_MS));
  }

  await db.insert(syncLogs).values({
    type: "parse",
    status: errors.length > 0 ? "partial" : "success",
    projectsFound: allParsed.length,
    projectsNew: newCount,
    projectsAnalyzed: analyzedCount,
    message: errors.length > 0 ? errors.join("\n") : undefined,
  });

  return {
    ok: true,
    found: allParsed.length,
    new: newCount,
    analyzed: analyzedCount,
    backlog: backlogCount,
    errors,
  };
}
