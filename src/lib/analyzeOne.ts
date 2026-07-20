import { db } from "./db";
import { projects, analyses, blacklist, settings } from "@/db/schema";
import { analyzeProject, classifyClient, type AnalysisResult } from "./ai";
import { sendProjectNotification } from "./telegram";
import { EXCLUDED_KEYWORDS, EXCLUDED_CATEGORY_IDS } from "./prompt";
import { eq } from "drizzle-orm";

export interface ProjectRow {
  id: number;
  platformId: string;
  platform: string;
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
  url: string | null;
}

// Дефолтный мин. бюджет: отсекает мусорные заказы за копейки и экономит
// лимит Groq. Переопределяется через Settings (0 = выключить фильтр).
const DEFAULT_MIN_BUDGET = 3000;

async function getMinBudget(): Promise<number | null> {
  const [s] = await db.select().from(settings)
    .where(eq(settings.key, "min_budget")).limit(1);
  if (!s) return DEFAULT_MIN_BUDGET;
  const v = s.value as unknown as string;
  const parsed = v ? parseFloat(v) : NaN;
  if (isNaN(parsed)) return DEFAULT_MIN_BUDGET;
  // 0 или отрицательное значение = фильтр выключен
  return parsed > 0 ? parsed : null;
}

function checkExcludedKeywords(name: string, description: string): string | null {
  const text = `${name} ${description}`.toLowerCase();
  for (const kw of EXCLUDED_KEYWORDS) {
    if (text.includes(kw)) return kw;
  }
  return null;
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
    const cleanPrice = String(project.priceLimit).replace(/[^0-9.,]/g, "").replace(",", ".");
    const price = parseFloat(cleanPrice);
    if (!isNaN(price) && price < minBudget) {
      await db.update(projects)
        .set({ status: "skipped", skipReason: `Мин. бюджет ${minBudget} ₽, проект ${price} ₽`, updatedAt: new Date() })
        .where(eq(projects.id, project.id));
      throw new Error(`Project budget ${price} ₽ is below minimum ${minBudget} ₽`);
    }
  }

  if (project.categoryId === 0) {
    // Freelancer: categoryId=0 значит не попал в целевые категории
    // (сайты/боты/парсеры/верстка). Пропускаем без анализа.
    await db.update(projects)
      .set({ status: "skipped", skipReason: "Категория не в целевых (Freelancer)", updatedAt: new Date() })
      .where(eq(projects.id, project.id));
    throw new Error(`Category not in targets (platform=${project.platform})`);
  }

  if (EXCLUDED_CATEGORY_IDS.has(project.categoryId)) {
    await db.update(projects)
      .set({ status: "skipped", skipReason: `Категория не подходит (ID: ${project.categoryId})`, updatedAt: new Date() })
      .where(eq(projects.id, project.id));
    throw new Error(`Category ${project.categoryId} is excluded`);
  }

  const excludedKw = checkExcludedKeywords(project.name, project.description);
  if (excludedKw) {
    await db.update(projects)
      .set({ status: "skipped", skipReason: `Ключевое слово: "${excludedKw}"`, updatedAt: new Date() })
      .where(eq(projects.id, project.id));
    throw new Error(`Excluded keyword: "${excludedKw}"`);
  }

  const clientVerdict = classifyClient(project.userWantsCount, project.userHiredPercent);
  if (clientVerdict.action === "block") {
    await db.update(projects)
      .set({ status: "blacklisted", skipReason: clientVerdict.reason, updatedAt: new Date() })
      .where(eq(projects.id, project.id));

    if (userName) {
      const [existing] = await db.select().from(blacklist)
        .where(eq(blacklist.userName, userName)).limit(1);
      if (!existing) {
        await db.insert(blacklist).values({
          userName,
          reason: `Авто-блок: ${clientVerdict.reason}`,
          autoBlocked: true,
          blockCount: 1,
        });
      } else {
        await db.update(blacklist)
          .set({ blockCount: (existing.blockCount || 0) + 1, autoBlocked: true })
          .where(eq(blacklist.userName, userName));
      }
    }

    throw new Error(`Auto-blocked: ${userName} (${clientVerdict.reason})`);
  }

  if (clientVerdict.action === "skip") {
    await db.update(projects)
      .set({ status: "skipped", skipReason: clientVerdict.reason, updatedAt: new Date() })
      .where(eq(projects.id, project.id));
    throw new Error(`Skipped by client-scoring: ${clientVerdict.reason}`);
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
    modelUsed: process.env.AI_MODEL || "qwen/qwen3-32b",
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
      project.platform,
      project.url,
    );
  }

  return result;
}