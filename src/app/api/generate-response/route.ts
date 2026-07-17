import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateResponse, generateTwoResponses, saveGeneratedResponse } from "@/lib/ai";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { projectId, variant } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (variant === "both") {
      const result = await generateTwoResponses(
        project.name,
        project.description,
        project.priceLimit,
        project.maxDays,
      );

      // Сохраняем оба варианта для A/B-сравнения
      await Promise.all([
        saveGeneratedResponse(project.id, result.variantA),
        saveGeneratedResponse(project.id, result.variantB),
      ]);

      return NextResponse.json({
        variantA: result.variantA,
        variantB: result.variantB,
      });
    }

    const result = await generateResponse(
      project.name,
      project.description,
      project.priceLimit,
      project.maxDays,
    );

    await saveGeneratedResponse(project.id, result);

    return NextResponse.json({
      responseText: result.responseText,
      responseCost: result.responseCost,
      responseTimeline: result.responseTimeline,
    });
  } catch (error) {
    logger.error("generate-response:POST", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
