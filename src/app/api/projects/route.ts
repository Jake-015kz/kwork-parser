import { NextRequest, NextResponse } from "next/server";
import { getProjects, type ProjectFilters } from "@/lib/queries";

export const dynamic = "force-dynamic";

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
    console.error("Failed to fetch projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
