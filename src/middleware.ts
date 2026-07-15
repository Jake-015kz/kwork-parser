import { NextRequest, NextResponse } from "next/server";

const API_SECRET = process.env.API_SECRET;
const CRON_SECRET = process.env.CRON_SECRET;

const PUBLIC_API_ROUTES = [
  "/api/telegram/webhook",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (pathname.startsWith("/api/cron")) {
    if (CRON_SECRET && token === CRON_SECRET) {
      return NextResponse.next();
    }
  }

  if (!API_SECRET) {
    return NextResponse.json(
      { ok: false, error: "API_SECRET not configured" },
      { status: 500 }
    );
  }

  if (!token || token !== API_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
