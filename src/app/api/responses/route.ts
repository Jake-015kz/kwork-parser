import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { responses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminToken } from "@/lib/auth";
import {
  getResponses,
  getResponseForProject,
  applyResponseStatusTransition,
} from "@/lib/queries";
import { parseBody, responsePostSchema, responsePatchSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status") ?? undefined;

  try {
    if (projectId) {
      const pid = Number(projectId);
      if (isNaN(pid)) {
        return NextResponse.json({ error: "invalid projectId" }, { status: 400 });
      }
      const result = await getResponseForProject(pid);
      if (!result) {
        return NextResponse.json({ error: "No response generated" }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    const items = await getResponses(status);
    return NextResponse.json({ items });
  } catch (error) {
    logger.error("responses:GET", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authError = requireAdminToken(req);
  if (authError) return authError;

  const parsed = await parseBody(req, responsePostSchema);
  if (!parsed.ok) return parsed.error;

  const { projectId, content, status: newStatus } = parsed.data;

  try {
    const [existing] = await db
      .select()
      .from(responses)
      .where(eq(responses.projectId, projectId))
      .limit(1);

    if (existing) {
      await db
        .update(responses)
        .set({
          content,
          status: newStatus || "queued",
          sent: false,
          sentAt: null,
          viewedAt: null,
          respondedAt: null,
          rejectedAt: null,
          rejectReason: null,
        })
        .where(eq(responses.id, existing.id));
    } else {
      await db.insert(responses).values({
        projectId,
        content,
        status: newStatus || "queued",
        sent: false,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("responses:POST", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const authError = requireAdminToken(req);
  if (authError) return authError;

  const parsed = await parseBody(req, responsePatchSchema);
  if (!parsed.ok) return parsed.error;

  const { id, status: newStatus, kworkOfferId, rejectReason } = parsed.data;

  try {
    await applyResponseStatusTransition(id, newStatus, { kworkOfferId, rejectReason });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("responses:PATCH", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
