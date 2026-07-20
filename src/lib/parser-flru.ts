import type { ParsedProject } from "./project-types";

const RSS_URL = "https://www.fl.ru/rss/all.xml";

// Целевые категории FL.ru (slug из URL /projects/category/<slug>/)
// маппим на твои Kwork-категории для единообразной фильтрации.
const FL_CATEGORY_MAP: Record<string, number> = {
  saity: 37,          // Создание и доработка сайтов
  "dorabotka-saitov": 38,
  mobilnye_prilozheniya: 39,
  vertska: 79,        // Вёрстка
  "skripty-boty": 41, // Скрипты, боты и разработка
  programmirovanie: 41,
  "parsing-dannikh": 41,
  "sozdanie-botov": 41,
  "integratsiya-api": 38,
  "dizain-saita": 37,
  "landing-page": 37,
};

function extractBudget(text: string): string | null {
  // FL.ru пишет бюджет в title: "(Бюджет: 40 000  ₽, для всех)"
  const m = text.match(/Бюджет:\s*([\d\s]+)\s*₽/i);
  if (m) return m[1].replace(/\s/g, "").trim();
  // иногда "договорная" / "конкурс" — не парсим
  return null;
}

function extractCategoryFromUrl(url: string): number {
  const m = url.match(/\/projects\/category\/([^/]+)\//);
  if (m && FL_CATEGORY_MAP[m[1]]) return FL_CATEGORY_MAP[m[1]];
  return 0; // не целевая — отфильтруется в runParse по TARGET_CATEGORIES
}

function cleanText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#8381;/g, "₽")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);
}

function extractIdFromUrl(url: string): string | null {
  const m = url.match(/\/projects\/(\d+)\//);
  return m ? m[1] : null;
}

function parseRss(xml: string): ParsedProject[] {
  const projects: ParsedProject[] = [];
  const seen = new Set<string>();

  // Разбиваем на <item>...</item>
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const block = itemMatch[1];

    const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)
      || block.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
    const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i)
      || block.match(/<description>([\s\S]*?)<\/description>/i);

    const title = titleMatch?.[1]?.trim() || "";
    const url = linkMatch?.[1]?.trim() || "";
    const descriptionRaw = descMatch?.[1] || "";

    if (!url) continue;
    const id = extractIdFromUrl(url);
    if (!id || seen.has(id)) continue;
    seen.add(id);

    // убираем "(Бюджет: ...)" из заголовка — это служебное
    const cleanTitle = title.replace(/\(Бюджет:.*?\)/i, "").trim() || title;

    projects.push({
      platformId: `flru_${id}`,
      platform: "flru",
      categoryId: extractCategoryFromUrl(url),
      name: cleanTitle,
      description: cleanText(descriptionRaw),
      budget: extractBudget(title),
      maxDays: null,
      userName: null,
      userRating: null,
      userHiredPercent: null,
      userWantsCount: null,
      userBadges: [],
      url,
      viewsCount: null,
      dateCreate: null,
    });
  }

  return projects;
}

export async function fetchFlRuProjects(): Promise<ParsedProject[]> {
  try {
    const res = await fetch(RSS_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`FL.ru RSS fetch failed: ${res.status}`);
      return [];
    }

    const xml = await res.text();
    return parseRss(xml);
  } catch (err) {
    console.error("FL.ru fetch error:", err);
    return [];
  }
}
