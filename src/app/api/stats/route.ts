import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, analyses, syncLogs, responses } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { CONTACT_REGEX } from "@/lib/contacts-regex";

export async function GET() {
 try {
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

  const [contactRows] = await db
    .select({ value: sql<number>`count(*)` })
    .from(projects)
    .where(sql`${projects.description} ~* ${CONTACT_REGEX}`);

  // Conversion stats
  const [submittedRows] = await db
    .select({ value: sql<number>`count(*)` })
    .from(responses)
    .where(sql`${responses.sent} = true`);

  const [viewedRows] = await db
    .select({ value: sql<number>`count(*)` })
    .from(responses)
    .where(sql`${responses.viewedAt} IS NOT NULL`);

  const [conversionRows] = await db
    .select({ value: sql<number>`count(*)` })
    .from(responses)
    .where(sql`${responses.respondedAt} IS NOT NULL`);

  const [rejectedRows] = await db
    .select({ value: sql<number>`count(*)` })
    .from(responses)
    .where(sql`${responses.rejectedAt} IS NOT NULL`);

  const submittedCount = Number(submittedRows.value);
  const conversionCount = Number(conversionRows.value);
  const conversionRate = submittedCount > 0 ? Math.round((conversionCount / submittedCount) * 100) : 0;

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
      withContacts: Number(contactRows.value),
    },
    conversion: {
      submitted: submittedCount,
      viewed: Number(viewedRows.value),
      responded: conversionCount,
      rejected: Number(rejectedRows.value),
      conversionRate,
    },
    logs: logData,
  });
 } catch (error: any) {
  console.error("stats error:", error);
  return NextResponse.json(
    { error: "Internal server error", v: "s3", detail: error?.message || String(error), regex: CONTACT_REGEX },
    { status: 500 }
  );
 }
}
