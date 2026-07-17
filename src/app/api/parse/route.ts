import { NextResponse } from "next/server";
import { runParseAndAnalyze } from "@/lib/runParse";
import { requireCronSecret } from "@/lib/auth";

export const maxDuration = 300;

export async function POST(req: Request) {
  const authError = requireCronSecret(req);
  if (authError) return authError;

  try {
    const result = await runParseAndAnalyze(10);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
