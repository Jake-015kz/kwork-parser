import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const out: Record<string, unknown> = {};
  try {
    const ping = await db.execute(sql`SELECT 1 AS ok`);
    out.ping = ping;
  } catch (e) {
    out.pingError = String(e);
  }
  try {
    const tables = await db.execute(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' ORDER BY table_name
    `);
    out.tables = tables;
  } catch (e) {
    out.tablesError = String(e);
  }
  try {
    const cols = await db.execute(sql`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name='projects' ORDER BY ordinal_position
    `);
    out.projectsColumns = cols;
  } catch (e) {
    out.projectsColumnsError = String(e);
  }
  try {
    const r = await db.execute(sql`SELECT count(*)::int AS n FROM projects`);
    out.projectsCount = r;
  } catch (e) {
    out.projectsCountError = String(e);
  }
  return NextResponse.json(out);
}
