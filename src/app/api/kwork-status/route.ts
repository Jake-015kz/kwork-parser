import { NextResponse } from "next/server";
import { getActor, getConnects } from "@/lib/kwork-api";

export async function GET() {
  try {
    const login = process.env.KWORK_LOGIN;
    if (!login) {
      return NextResponse.json({ connected: false });
    }

    const [actor, connects] = await Promise.all([
      getActor().catch(() => null),
      getConnects().catch(() => null),
    ]);

    if (!actor) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      username: actor.username,
      rating: actor.rating,
      balance: actor.free_amount,
      activeConnects: connects?.active_connects ?? 0,
      totalConnects: connects?.all_connects ?? 0,
      completedOrders: actor.completed_orders_count,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
