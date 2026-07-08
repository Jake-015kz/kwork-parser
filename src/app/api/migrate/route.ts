import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const MIGRATION_STATEMENTS = [
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS "platform" varchar(20) DEFAULT 'kwork' NOT NULL`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS "platform_id" varchar(100)`,
  `UPDATE projects SET "platform_id" = 'kwork_' || "kwork_id" WHERE "platform_id" IS NULL`,
  `ALTER TABLE projects ALTER COLUMN "platform_id" SET NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "platform_id_idx" ON "projects" ("platform_id")`,
];

export async function POST() {
  const results: string[] = [];
  for (const stmt of MIGRATION_STATEMENTS) {
    try {
      await db.execute(sql.raw(stmt));
      results.push(`OK: ${stmt.substring(0, 60)}...`);
    } catch (err) {
      const msg = String(err);
      if (msg.includes("already exists") || msg.includes("column") && msg.includes("does not exist") === false) {
        results.push(`SKIP: ${stmt.substring(0, 60)}... (${msg.substring(0, 80)})`);
      } else {
        results.push(`ERR: ${stmt.substring(0, 60)}... (${msg.substring(0, 80)})`);
      }
    }
  }
  return NextResponse.json({ ok: true, results });
}
