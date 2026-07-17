import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, analyses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateResponse, generateTwoResponses } from "@/lib/ai";

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
      await db.insert(analyses).values([
        {
          projectId: project.id,
          verdict: "generated",
          score: 0,
          reasoning: { match: "", budget: "", timeline: "", client: "", risks: "" },
          responseText: result.variantA.responseText,
          responseCost: result.variantA.responseCost,
          responseTimeline: result.variantA.responseTimeline,
          modelUsed: process.env.AI_MODEL || "qwen/qwen3-32b",
        },
        {
          projectId: project.id,
          verdict: "generated",
          score: 0,
          reasoning: { match: "", budget: "", timeline: "", client: "", risks: "" },
          responseText: result.variantB.responseText,
          responseCost: result.variantB.responseCost,
          responseTimeline: result.variantB.responseTimeline,
          modelUsed: process.env.AI_MODEL || "qwen/qwen3-32b",
        },
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

    await db.insert(analyses).values({
      projectId: project.id,
      verdict: "generated",
      score: 0,
      reasoning: { match: "", budget: "", timeline: "", client: "", risks: "" },
      responseText: result.responseText,
      responseCost: result.responseCost,
      responseTimeline: result.responseTimeline,
      modelUsed: process.env.AI_MODEL || "qwen/qwen3-32b",
    });

    return NextResponse.json({
      responseText: result.responseText,
      responseCost: result.responseCost,
      responseTimeline: result.responseTimeline,
    });
  } catch (error) {
    console.error("Failed to generate response:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
