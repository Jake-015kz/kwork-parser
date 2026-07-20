import type { ParsedProject } from "./project-types";

const BASE_URL = "https://weblancer.net/freelance/";

// Маппинг slug-категории Weblancer -> твои Kwork-категории (37/38/39/79/41).
// Slug меняется (теперь "veb-programmirovanie-31"), поэтому маппим по
// ключевым словам, а не по точному совпадению.
function mapCategoryBySlug(slug: string): number {
  const s = slug.toLowerCase();
  if (/(bot|parser|parsing|skript|avtomatiz|api|integrac)/.test(s)) return 41;
  if (/(mobil|android|ios|flutter|react-native)/.test(s)) return 39;
  if (/(verstk|html|css|frontend|react|vue)/.test(s)) return 79;
  if (/(sait|wordpress|tilda|bitrix|cmc|landing|web)/.test(s)) return 37;
  if (/(programmirovanie|razrabotk|backend|node|python|php|1c)/.test(s)) return 38;
  return 0; // не целевая
}

function extractIdFromUrl(url: string): string | null {
  // последнее число перед закрывающим слэшем = ID проекта
  // /freelance/<cat-slug>-<catId>/<proj-slug>-<projId>/
  const matches = url.match(/\/(\d+)\//g);
  if (matches && matches.length > 0) {
    const last = matches[matches.length - 1];
    return last.replace(/\D/g, "");
  }
  return null;
}

function extractCategoryFromUrl(url: string): string | null {
  const match = url.match(/\/freelance\/([^/]+)\//);
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

function parseProjectsFromHtml(html: string): ParsedProject[] {
  const projects: ParsedProject[] = [];
  const seen = new Set<string>();

  const projectRegex = /href="(\/freelance\/[a-z0-9-]+-\d+\/[a-z0-9-]+-\d+\/)"/gi;
  let match: RegExpExecArray | null;

  while ((match = projectRegex.exec(html)) !== null) {
    const urlPath = match[1];
    const id = extractIdFromUrl(urlPath);
    const categorySlug = extractCategoryFromUrl(urlPath);

    if (!id || !categorySlug) continue;
    const categoryId = mapCategoryBySlug(categorySlug);
    if (categoryId === 0) continue;
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
      categoryId: mapCategoryBySlug(categorySlug),
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
      },
      redirect: "follow",
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      throw new Error(`Weblancer HTTP ${res.status}`);
    }

    html = await res.text();
  } catch (err) {
    console.error("Weblancer fetch error:", err);
    throw err;
  }

  const projects = parseProjectsFromHtml(html);
  return projects;
}
