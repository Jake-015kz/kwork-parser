import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, analyses, syncLogs, responses } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET() {
  const [totalRows] = await db
    .select({ value: sql<number>`count(*)` })
    .from(projects);

  const [newRows] = await db
    .select({ value: sql<number>`count(*)` })
    .from(projects)
    .where(eq(projects.status, "new"));

  const [analyzedRows] = await db
    .select({ value: sql<number>`count(*)` })
    .from(projects)
    .where(eq(projects.status, "analyzed"));

  const [worthRows] = await db
    .select({ value: sql<number>`count(*)` })
    .from(analyses)
    .where(eq(analyses.verdict, "worth"));

  const [respondedRows] = await db
    .select({ value: sql<number>`count(*)` })
    .from(responses);

  const logData = await db
    .select()
    .from(syncLogs)
    .orderBy(desc(syncLogs.createdAt))
    .limit(20);

  return NextResponse.json({
    stats: {
      total: Number(totalRows.value),
      new: Number(newRows.value),
      analyzed: Number(analyzedRows.value),
      worth: Number(worthRows.value),
      responded: Number(respondedRows.value),
    },
    logs: logData,
  });
}
