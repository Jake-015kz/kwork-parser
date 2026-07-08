import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const MIGRATION_SQL = `
-- Add platform columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS "platform" varchar(20) DEFAULT 'kwork' NOT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS "platform_id" varchar(100);

-- Set platform_id for existing projects
UPDATE projects SET "platform_id" = 'kwork_' || "kwork_id" WHERE "platform_id" IS NULL;

-- Make platform_id NOT NULL after backfill
ALTER TABLE projects ALTER COLUMN "platform_id" SET NOT NULL;

-- Create unique index on platform_id
CREATE UNIQUE INDEX IF NOT EXISTS "platform_id_idx" ON "projects" USING btree ("platform_id");
`;

export async function POST() {
  try {
    const statements = MIGRATION_SQL
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));

    for (const stmt of statements) {
      await db.execute(sql.raw(stmt));
    }

    return NextResponse.json({ ok: true, message: "Migration applied successfully" });
  } catch (err) {
    console.error("Migration error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
