import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDashboardStats();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
