import { db } from "./db";
import { projects } from "@/db/schema";
import { analyzeOneProject } from "./analyzeOne";
import { inArray, eq } from "drizzle-orm";
import type { ParsedProject } from "./project-types";

const ANALYSIS_DELAY_MS = 2000;

export interface InsertResult {
  newCount: number;
  analyzedCount: number;
  errors: string[];
}

export async function insertProjects(
  parsed: ParsedProject[],
  opts: { analyze?: boolean } = {}
): Promise<InsertResult> {
  const { analyze = true } = opts;
  const errors: string[] = [];
  let newCount = 0;
  let analyzedCount = 0;

  const platformIdsToCheck = parsed.map((p) => p.platformId);
  const existingIds = await db
    .select({ platformId: projects.platformId })
    .from(projects)
    .where(inArray(projects.platformId, platformIdsToCheck));
  const existingSet = new Set(existingIds.map((p) => p.platformId));

  for (const p of parsed) {
    if (existingSet.has(p.platformId)) continue;

    let priceValue: number | null = null;
    if (p.budget) {
      const n = parseFloat(String(p.budget).replace(/[^\d.]/g, ""));
      if (!isNaN(n)) priceValue = n;
    }

    try {
      const [inserted] = await db
        .insert(projects)
        .values({
          platformId: p.platformId,
          platform: p.platform,
          kworkId: p.platform === "kwork" ? parseInt(p.platformId.split("_")[1]) || 0 : 0,
          categoryId: p.categoryId,
          name: (p.name || "").slice(0, 490),
          description: p.description || "",
          priceLimit: priceValue,
          maxDays: p.maxDays,
          userName: p.userName,
          userRating: p.userRating,
          userHiredPercent: p.userHiredPercent,
          userWantsCount: p.userWantsCount,
          userBadges: p.userBadges,
          url: (p.url || "").slice(0, 490),
          viewsCount: p.viewsCount,
          dateCreate: p.dateCreate ? new Date(p.dateCreate) : null,
          status: "new",
        })
        .returning();

      newCount++;

      if (analyze) {
        try {
          await analyzeOneProject(inserted);
          analyzedCount++;
        } catch (err) {
          // analyzeOneProject ставит skipped/blacklisted при ожидаемом
          // пропуске (мин. бюджет, чёрный список, excluded keyword) и бросает
          // Error. Не перезаписываем этот статус на "error" — иначе
          // статистика ломается, а проект выглядит упавшим. "error" только
          // если анализ реально упал (статус остался new).
          const [cur] = await db
            .select({ status: projects.status })
            .from(projects)
            .where(eq(projects.id, inserted.id));
          if (cur && cur.status === "new") {
            errors.push(`Analysis error for ${p.platformId}: ${err}`);
            await db
              .update(projects)
              .set({ status: "error", updatedAt: new Date() })
              .where(eq(projects.id, inserted.id));
          }
        }

        await new Promise((r) => setTimeout(r, ANALYSIS_DELAY_MS));
      }
    } catch (err) {
      errors.push(`Insert error for ${p.platformId}: ${err}`);
      console.error(`Insert failed for ${p.platformId}:`, err);
    }
  }

  return { newCount, analyzedCount, errors };
}
