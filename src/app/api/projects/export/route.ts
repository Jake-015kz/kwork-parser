import { db } from "@/lib/db";
import { projects, analyses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authError = requireAdminToken(req);
  if (authError) return authError;

  try {
    const items = await db
      .select({
        id: projects.id,
        platform: projects.platform,
        kworkId: projects.kworkId,
        categoryId: projects.categoryId,
        name: projects.name,
        priceLimit: projects.priceLimit,
        maxDays: projects.maxDays,
        userName: projects.userName,
        userHiredPercent: projects.userHiredPercent,
        userWantsCount: projects.userWantsCount,
        status: projects.status,
        skipReason: projects.skipReason,
        url: projects.url,
        createdAt: projects.createdAt,
        verdict: analyses.verdict,
        score: analyses.score,
        responseCost: analyses.responseCost,
        responseTimeline: analyses.responseTimeline,
        responseText: analyses.responseText,
      })
      .from(projects)
      .leftJoin(analyses, eq(analyses.projectId, projects.id))
      .orderBy(desc(projects.createdAt));

    const header = "ID;Платформа;Название;Статус;Вердикт;Оценка;Бюджет;Срок;Заказчик;Найм%;Проектов зак-ля;Цена отклика;Срок отклика;Дата;URL\n";
    const rows = items.map((p) =>
      [
        p.id,
        p.platform,
        `"${(p.name || "").replace(/"/g, '""')}"`,
        p.status,
        p.verdict || "",
        p.score || "",
        p.priceLimit || "",
        p.maxDays || "",
        `"${(p.userName || "").replace(/"/g, '""')}"`,
        p.userHiredPercent ?? "",
        p.userWantsCount ?? "",
        p.responseCost || "",
        p.responseTimeline || "",
        p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : "",
        `"${(p.url || "").replace(/"/g, '""')}"`,
      ].join(";")
    );

    return new Response(header + rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kwork-projects-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Export failed: ${String(err)}` },
      { status: 500 }
    );
  }
}
