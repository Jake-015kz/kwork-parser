export function buildProjectUrl(
  url: string | null | undefined,
  platform: string,
  kworkId: number
): string {
  if (url) return url;
  if (platform === "weblancer") return url ?? "";
  return `https://kwork.ru/projects/${kworkId}/view`;
}

const ADMIN_TOKEN_KEY = "admin_token";

export function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

export function setAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

/**
 * fetch с автоматической подстановкой admin-токена (x-admin-token).
 * Используется для защищённых мутаций (settings, blacklist, responses,
 * projects/status). Токен берётся из localStorage, куда его однократно
 * вводит пользователь в SettingsTab.
 */
export async function authedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("x-admin-token", token);
  return fetch(url, { ...options, headers });
}
