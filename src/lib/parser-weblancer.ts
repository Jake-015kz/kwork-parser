import type { ParsedProject } from "./project-types";

const BASE_URL = "https://weblancer.net/freelance/";

const TARGET_CATEGORIES: Record<string, number> = {
  "programmirovanie": 38,
  "sozdanie-saitov": 37,
  "dorabotka-saitov": 37,
  "parsing-dannikh": 41,
  "sozdanie-botov": 41,
  "integratsiya-api": 38,
  "verstka-saitov": 79,
};

function extractIdFromUrl(url: string): string | null {
  const match = url.match(/\/(\d+)\//);
  return match ? match[1] : null;
}

function extractCategoryFromUrl(url: string): string | null {
  const match = url.match(/\/freelance\/([^/]+)\/\d+\//);
  return match ? match[1] : null;
}

function extractBudget(text: string): string | null {
  const match = text.match(/\$(\d[\d\s]*)/);
  if (match) return match[1].replace(/\s/g, "").trim();
  const rubMatch = text.match(/(\d[\d\s]*)\s*(?:₽|руб)/);
  if (rubMatch) return rubMatch[1].replace(/\s/g, "").trim();
  return null;
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8381;/g, "₽")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

function mapCategory(slug: string): number {
  return TARGET_CATEGORIES[slug] || 0;
}

function isRelevantCategory(slug: string): boolean {
  return slug in TARGET_CATEGORIES;
}

function parseProjectsFromHtml(html: string): ParsedProject[] {
  const projects: ParsedProject[] = [];
  const seen = new Set<string>();

  const projectRegex = /href="(\/freelance\/[^"]*\/\d+\/)"/gi;
  let match: RegExpExecArray | null;

  while ((match = projectRegex.exec(html)) !== null) {
    const urlPath = match[1];
    const id = extractIdFromUrl(urlPath);
    const categorySlug = extractCategoryFromUrl(urlPath);

    if (!id || !categorySlug || !isRelevantCategory(categorySlug)) continue;
    if (seen.has(id)) continue;
    seen.add(id);

    const startIdx = Math.max(0, match.index - 500);
    const endIdx = Math.min(html.length, match.index + 1000);
    const context = html.substring(startIdx, endIdx);

    const titleMatch = context.match(/<[^>]*class="[^"]*title[^"]*"[^>]*>\s*([^<]+)/i)
      || context.match(/<h\d[^>]*>\s*([^<]+)/i)
      || context.match(/href="[^"]*"[^>]*>\s*([^<]{10,})/i);

    const title = titleMatch?.[1]?.trim() || "";
    if (!title || title.length < 5) continue;

    const descMatch = context.match(/<[^>]*class="[^"]*(?:desc|text|content|txt|excerpt)[^"]*"[^>]*>([\s\S]*?)<\/[^>]*>/i);
    const description = descMatch?.[1] ? cleanText(descMatch[1]) : title;

    const budget = extractBudget(title + " " + description);

    projects.push({
      platformId: `weblancer_${id}`,
      platform: "weblancer",
      categoryId: mapCategory(categorySlug),
      name: title,
      description,
      budget,
      maxDays: null,
      userName: null,
      userRating: null,
      userHiredPercent: null,
      userWantsCount: null,
      userBadges: [],
      url: `https://weblancer.net${urlPath}`,
      viewsCount: null,
      dateCreate: null,
    });
  }

  return projects;
}

export async function fetchWeblancerProjects(): Promise<ParsedProject[]> {
  let html: string;

  try {
    const res = await fetch(BASE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ru-RU,ru;q=0.9",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`Weblancer fetch failed: ${res.status}`);
      return [];
    }

    html = await res.text();
  } catch (err) {
    console.error("Weblancer fetch error:", err);
    return [];
  }

  const projects = parseProjectsFromHtml(html);
  return projects;
}
