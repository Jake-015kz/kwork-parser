import { NextResponse } from "next/server";
import { fetchFlRssProjects } from "@/lib/parser-fl-rss";
import { insertProjects } from "@/lib/insertProjects";

export async function POST() {
  try {
    const parsed = await fetchFlRssProjects();
    const result = await insertProjects(parsed);

    return NextResponse.json({
      ok: true,
      found: parsed.length,
      new: result.newCount,
      analyzed: result.analyzedCount,
      errors: result.errors,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
