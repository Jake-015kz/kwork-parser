import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/db/schema";
import { sql } from "drizzle-orm";

const REGEX_OLD = `@[\\wа-я]{3,}|t\\.me/|[\\w.+-]+@[\\w.-]+\\.[\\w]{2,}|whatsapp|ва?тсап|(\\+7|8)[\\s-]?\\(?\\d{3}\\)?[\\s-]?\\d{3}[\\s-]?\\d{2}[\\s-]?\\d{2}`;
const REGEX_POSIX = `@[[:alnum:]_а-яё]{3,}|t\\.me/|[[:alnum:].+-]+@[[:alnum:].-]+\\.[[:alpha:]]{2,}|whatsapp|ва?тсап|(\\+7|8)[[:space:]-]?\\(?[[:digit:]]{3}\\)?[[:space:]-]?[[:digit:]]{3}[[:space:]-]?[[:digit:]]{2}[[:space:]-]?[[:digit:]]{2}`;

export async function GET() {
  const out: Record<string, unknown> = { v: "r5" };
  try {
    const oldR = await db.execute(sql`SELECT count(*)::int AS n FROM projects WHERE ${projects.description} ~* ${REGEX_OLD}`);
    out.oldRegexCount = oldR;
  } catch (e: any) {
    out.oldRegexError = e?.message;
  }
  try {
    const posixR = await db.execute(sql`SELECT count(*)::int AS n FROM projects WHERE ${projects.description} ~* ${REGEX_POSIX}`);
    out.posixRegexCount = posixR;
  } catch (e: any) {
    out.posixRegexError = e?.message;
  }
  return NextResponse.json(out);
}
