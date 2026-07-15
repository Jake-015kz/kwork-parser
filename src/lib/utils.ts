export function buildProjectUrl(
  url: string | null | undefined,
  platform: string,
  kworkId: number
): string {
  if (url) return url;
  if (platform === "fl") return `https://www.fl.ru/projects/${kworkId}`;
  return `https://kwork.ru/projects/${kworkId}/view`;
}
