import { db } from "./db";
import { projects, syncLogs } from "@/db/schema";
import { fetchAllCategoriesProjects, type KworkProject } from "./parser";
import { fetchFlProjects, mapFlCategoryToKwork, type FlProject } from "./parser-fl";
import { analyzeOneProject } from "./analyzeOne";
import { eq, asc, inArray } from "drizzle-orm";
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

function flToParsed(fp: FlProject): ParsedProject {
  return {
    platformId: `fl_${fp.id}`,
    platform: "fl",
    categoryId: mapFlCategoryToKwork(fp.category),
    name: fp.title,
    description: fp.description || "",
    budget: fp.budget || null,
    maxDays: null,
    userName: null,
    userRating: null,
    userHiredPercent: null,
    userWantsCount: null,
    userBadges: [],
    url: fp.url,
    viewsCount: null,
    dateCreate: fp.dateCreate || null,
  };
}

async function insertAndAnalyze(parsed: ParsedProject[], errors: string[]): Promise<{ newCount: number; analyzedCount: number }> {
  let newCount = 0;
  let analyzedCount = 0;

  const existingIds = await db
    .select({ platformId: projects.platformId })
    .from(projects);
  const existingSet = new Set(existingIds.map((p) => p.platformId));

  for (const p of parsed) {
    if (existingSet.has(p.platformId)) continue;

    const [inserted] = await db
      .insert(projects)
      .values({
        platformId: p.platformId,
        platform: p.platform,
        kworkId: parseInt(p.platformId.split("_")[1]) || 0,
        categoryId: p.categoryId,
        name: p.name,
        description: p.description,
        priceLimit: p.budget,
        maxDays: p.maxDays,
        userName: p.userName,
        userRating: p.userRating,
        userHiredPercent: p.userHiredPercent,
        userWantsCount: p.userWantsCount,
        userBadges: p.userBadges,
        url: p.url,
        viewsCount: p.viewsCount,
        dateCreate: p.dateCreate ? new Date(p.dateCreate) : null,
        status: "new",
      })
      .returning();

    newCount++;
    analyzedCount++;

    try {
      await analyzeOneProject(inserted);
    } catch (err) {
      errors.push(`Analysis error for ${p.platformId}: ${err}`);
      const [cur] = await db.select({ status: projects.status }).from(projects).where(eq(projects.id, inserted.id));
      if (cur && cur.status === "new") {
        await db.update(projects).set({ status: "error", updatedAt: new Date() }).where(eq(projects.id, inserted.id));
      }
    }

    await new Promise((r) => setTimeout(r, ANALYSIS_DELAY_MS));
  }

  return { newCount, analyzedCount };
}

export async function runParseAndAnalyze(maxPages: number = 10): Promise<ParseResult> {
  const errors: string[] = [];
  let newCount = 0;
  let analyzedCount = 0;
  let backlogCount = 0;

  // Fetch from Kwork
  let kworkProjects: KworkProject[] = [];
  try {
    kworkProjects = await fetchAllCategoriesProjects(maxPages);
  } catch (err) {
    errors.push(`Kwork fetch error: ${err}`);
  }

  // Fetch from FL.ru
  let flProjects: FlProject[] = [];
  try {
    flProjects = await fetchFlProjects(Math.min(maxPages, 5));
  } catch (err) {
    errors.push(`FL.ru fetch error: ${err}`);
  }

  // Convert and combine
  const allParsed: ParsedProject[] = [
    ...kworkProjects.map(kworkToParsed),
    ...flProjects.map(flToParsed),
  ];

  const result = await insertAndAnalyze(allParsed, errors);
  newCount = result.newCount;
  analyzedCount = result.analyzedCount;

  // Process backlog
  const backlog = await db
    .select()
    .from(projects)
    .where(inArray(projects.status, ["new", "error"]))
    .orderBy(asc(projects.createdAt));

  for (const p of backlog) {
    try {
      await analyzeOneProject(p);
      backlogCount++;
      analyzedCount++;
    } catch (err) {
      errors.push(`Backlog analysis error for project ${p.id}: ${err}`);
      const [cur] = await db.select({ status: projects.status }).from(projects).where(eq(projects.id, p.id));
      if (cur && cur.status === "new") {
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
