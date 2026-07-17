import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const out: Record<string, unknown> = { v: "r8" };
  try {
    const cols = await db.execute(sql`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name='responses' ORDER BY ordinal_position
    `);
    out.responsesColumns = cols;
  } catch (e: any) {
    out.error = e?.message;
  }
  try {
    const cols = await db.execute(sql`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name='projects' ORDER BY ordinal_position
    `);
    out.projectsColumns = cols;
  } catch (e: any) {
    out.projectsError = e?.message;
  }
  try {
    const cols = await db.execute(sql`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name='analyses' ORDER BY ordinal_position
    `);
    out.analysesColumns = cols;
  } catch (e: any) {
    out.analysesError = e?.message;
  }
  return NextResponse.json(out);
}
