import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/queries";
import { logger } from "@/lib/logger";

// Дешёвое кэширование дашборда на 30с (ISR) — снижает нагрузку на БД
// при частых обновлениях дашборда, данные остаются почти живыми.
export const revalidate = 30;

export async function GET() {
  try {
    const data = await getDashboardStats();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("stats:GET", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
