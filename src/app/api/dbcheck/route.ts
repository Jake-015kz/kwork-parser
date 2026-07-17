import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { responses } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const out: Record<string, unknown> = { v: "pd2" };
  const id = Number(new URL(req.url).searchParams.get("id") || "1");
  try {
    const r = await db.select().from(responses).where(eq(responses.projectId, id));
    out.responses = r.length;
  } catch (e: any) {
    out.responsesError = (e?.message || "").split("\nparams:")[0];
    out.cause = e?.cause?.message || null;
  }
  try {
    const r = await db.execute(sql`SELECT count(*)::int AS n FROM responses WHERE project_id = ${id}`);
    out.executeOk = r;
  } catch (e: any) {
    out.executeError = e?.message?.split("\n")[0];
  }
  return NextResponse.json(out);
}
