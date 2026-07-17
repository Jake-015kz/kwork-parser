import { z } from "zod";
import { NextResponse } from "next/server";

/** Валидация входных данных мутаций API. Централизованно, чтобы не принимать
 *  произвольный JSON, падающий потом в SQL-запросы. */

export const responsePostSchema = z.object({
  projectId: z.number().int().positive(),
  content: z.string().min(1, "content required").max(20000),
  status: z
    .enum(["queued", "submitted", "viewed", "responded", "rejected"])
    .optional(),
});

export const responsePatchSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["queued", "submitted", "viewed", "responded", "rejected"]),
  kworkOfferId: z.string().max(100).optional(),
  rejectReason: z.string().max(2000).optional(),
});

export const settingsPostSchema = z.object({
  chatId: z.string().max(100).optional(),
  minBudget: z.string().max(50).optional(),
});

export type ResponsePostInput = z.infer<typeof responsePostSchema>;
export type ResponsePatchInput = z.infer<typeof responsePatchSchema>;
export type SettingsPostInput = z.infer<typeof settingsPostSchema>;

/**
 * Парсит тело запроса через zod-схему.
 * Возвращает { data } при успехе или { error, status } при ошибке валидации.
 */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<
  | { ok: true; data: T }
  | { ok: false; error: NextResponse; status: number }
> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
      status: 400,
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 },
      ),
      status: 400,
    };
  }

  return { ok: true, data: result.data };
}
