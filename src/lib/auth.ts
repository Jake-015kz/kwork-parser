import { NextResponse } from "next/server";

/**
 * Защита API эндпоинтов.
 *
 * CRON_SECRET — для парсинга/анализа (cron, parse, analyze-backlog).
 *   Проверяется из хедера `x-cron-secret` либо query `?secret=`.
 * ADMIN_TOKEN — для мутаций данных и экспорта (blacklist, projects,
 *   responses, settings, export, migrate, setup-webhook).
 *   Проверяется из хедера `authorization: Bearer <token>` либо `x-admin-token`.
 *
 * Если соответствующая переменная окружения не задана — доступ открыт
 * (dev-режим). В проде обязательно задай обе переменные.
 */

function getCronSecret(): string | undefined {
  return process.env.CRON_SECRET || undefined;
}

function getAdminToken(): string | undefined {
  return process.env.ADMIN_TOKEN || undefined;
}

function cronSecretFromRequest(req: Request): string | undefined {
  const header = req.headers.get("x-cron-secret") || undefined;
  if (header) return header;
  try {
    const url = new URL(req.url);
    return url.searchParams.get("secret") || undefined;
  } catch {
    return undefined;
  }
}

function adminTokenFromRequest(req: Request): string | undefined {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return req.headers.get("x-admin-token") || undefined;
}

export function requireCronSecret(req: Request): NextResponse | null {
  // Vercel Cron (нативный) присылает подписанный заголовок x-vercel-cron
  if (req.headers.get("x-vercel-cron") === "1") return null;

  const expected = getCronSecret();
  if (!expected) return null; // не настроено → открыто (dev)
  const provided = cronSecretFromRequest(req);
  if (provided === expected) return null;
  return NextResponse.json(
    { error: "Unauthorized: invalid or missing cron secret" },
    { status: 401 },
  );
}

export function requireAdminToken(req: Request): NextResponse | null {
  const expected = getAdminToken();
  if (!expected) return null; // не настроено → открыто (dev)
  const provided = adminTokenFromRequest(req);
  if (provided === expected) return null;
  return NextResponse.json(
    { error: "Unauthorized: invalid or missing admin token" },
    { status: 401 },
  );
}
