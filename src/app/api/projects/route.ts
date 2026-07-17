import { NextRequest, NextResponse } from "next/server";
import { getProjects, type ProjectFilters } from "@/lib/queries";
import { logger } from "@/lib/logger";

// Кэшируем список проектов на 30с (ISR) — дашборд дёргает часто,
// БД при этом разгружается. Данные остаются почти живыми.
export const revalidate = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filters: ProjectFilters = {
    status: searchParams.get("status") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    verdict: searchParams.get("verdict") ?? undefined,
    platform: searchParams.get("platform") ?? undefined,
    minBudget: searchParams.get("minBudget") ?? undefined,
    maxBudget: searchParams.get("maxBudget") ?? undefined,
    hasContact: searchParams.get("hasContact") === "true",
    limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
    offset: searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined,
  };

  try {
    const result = await getProjects(filters);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("projects:GET", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
