import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const STMTS = [
  `ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'queued'`,
  `ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "kwork_offer_id" varchar(100)`,
  `ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "viewed_at" timestamp without time zone`,
  `ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "responded_at" timestamp without time zone`,
  `ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "rejected_at" timestamp without time zone`,
  `ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "reject_reason" text`,
];

export async function GET() {
  const out: Record<string, unknown> = { v: "migrate" };
  const results: string[] = [];
  for (const stmt of STMTS) {
    try {
      await db.execute(sql.raw(stmt));
      results.push(`OK: ${stmt.split('"')[1]}`);
    } catch (e: any) {
      results.push(`ERR: ${stmt.split('"')[1]} -> ${e?.message?.split("\n")[0]}`);
    }
  }
  out.results = results;

  // verify
  try {
    const cols = await db.execute(sql`
      SELECT column_name FROM information_schema.columns WHERE table_name='responses' ORDER BY ordinal_position
    `);
    out.columnsAfter = cols;
  } catch (e: any) {
    out.verifyError = e?.message;
  }
  return NextResponse.json(out);
}
