import { NextResponse } from "next/server";
import { runParseAndAnalyze } from "@/lib/runParse";

export async function GET() {
  try {
    const result = await runParseAndAnalyze(10);
    return NextResponse.json(result);
  } catch (err) {
    const errorMsg = String((err as Error & { cause?: unknown })?.cause ?? err);
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
