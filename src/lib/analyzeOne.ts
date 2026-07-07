import { db } from "./db";
import { projects, analyses, blacklist, settings } from "@/db/schema";
import { analyzeProject, checkClientSpammer, type AnalysisResult } from "./ai";
import { sendProjectNotification } from "./telegram";
import { eq } from "drizzle-orm";

export interface ProjectRow {
  id: number;
  kworkId: number;
  categoryId: number;
  name: string;
  description: string;
  priceLimit: string | null;
  maxDays: number | null;
  userName: string | null;
  userBadges: unknown;
  userHiredPercent: number | null;
  userWantsCount: number | null;
}

async function getMinBudget(): Promise<number | null> {
  const [s] = await db.select().from(settings)
    .where(eq(settings.key, "min_budget")).limit(1);
  if (!s) return null;
  const v = s.value as unknown as string;
  return v ? parseFloat(v) || null : null;
}

export async function analyzeOneProject(
  project: ProjectRow
): Promise<AnalysisResult> {
  const userName = project.userName;

  if (userName) {
    const [blocked] = await db.select().from(blacklist)
      .where(eq(blacklist.userName, userName)).limit(1);
    if (blocked) {
      await db.update(projects)
        .set({ status: "blacklisted", skipReason: `В чёрном списке: ${blocked.reason || "не указана"}`, updatedAt: new Date() })
        .where(eq(projects.id, project.id));
      throw new Error(`User ${userName} is blacklisted (${blocked.reason || "no reason"})`);
    }
  }

  const minBudget = await getMinBudget();
  if (minBudget && project.priceLimit) {
    const price = parseFloat(project.priceLimit.replace(/[^0-9.,]/g, "").replace(",", "."));
    if (!isNaN(price) && price < minBudget) {
      await db.update(projects)
        .set({ status: "skipped", skipReason: `Мин. бюджет ${minBudget} ₽, проект ${price} ₽`, updatedAt: new Date() })
        .where(eq(projects.id, project.id));
      throw new Error(`Project budget ${price} ₽ is below minimum ${minBudget} ₽`);
    }
  }

  if (checkClientSpammer(project.userWantsCount, project.userHiredPercent)) {
    await db.update(projects)
      .set({ status: "blacklisted", skipReason: `Спамер: ${project.userWantsCount} проектов, ${project.userHiredPercent}% найма`, updatedAt: new Date() })
      .where(eq(projects.id, project.id));

    if (userName) {
      const [existing] = await db.select().from(blacklist)
        .where(eq(blacklist.userName, userName)).limit(1);
      if (!existing) {
        await db.insert(blacklist).values({
          userName,
          reason: `Авто-блок: ${project.userWantsCount} проектов, ${project.userHiredPercent}% найма`,
          autoBlocked: true,
          blockCount: 1,
        });
      } else {
        await db.update(blacklist)
          .set({ blockCount: (existing.blockCount || 0) + 1, autoBlocked: true })
          .where(eq(blacklist.userName, userName));
      }
    }

    throw new Error(`Auto-blocked spammer: ${userName} (${project.userWantsCount} projects, ${project.userHiredPercent}% hired)`);
  }

  const result = await analyzeProject(
    project.name,
    project.description,
    project.priceLimit,
    project.maxDays,
    project.userName,
    (project.userBadges as string[]) || [],
    project.userHiredPercent,
    project.userWantsCount,
    project.categoryId,
  );

  await db.insert(analyses).values({
    projectId: project.id,
    verdict: result.verdict,
    score: result.score,
    reasoning: result.reasoning,
    responseText: result.response?.body || null,
    responseCost: result.response?.cost || null,
    responseTimeline: result.response?.timeline || null,
    modelUsed: process.env.AI_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free",
  });

  const newStatus = result.verdict === "not_worth" ? "skipped" : "analyzed";
  await db
    .update(projects)
    .set({
      status: newStatus,
      skipReason: result.verdict === "not_worth" ? `AI: ${result.reasoning?.match || "не подходит"}` : null,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, project.id));

  if (result.verdict !== "not_worth" && result.response) {
    await sendProjectNotification(
      project.id,
      project.kworkId,
      project.name,
      project.priceLimit,
      project.maxDays,
      result.verdict,
      result.score,
      undefined,
      result.response.cost,
      result.response.timeline,
    );
  }

  return result;
}