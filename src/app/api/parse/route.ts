import { NextResponse } from "next/server";
import { runParseAndAnalyze } from "@/lib/runParse";

export async function POST() {
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
