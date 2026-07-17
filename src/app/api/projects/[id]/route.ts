import { NextResponse } from "next/server";
import { getProjectDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const projectId = parseInt(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const detail = await getProjectDetail(projectId);
  if (!detail) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...detail.project,
    analyses: detail.analyses,
    responses: detail.responses,
  });
}
