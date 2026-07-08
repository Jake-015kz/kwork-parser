import type { ParsedProject } from "./project-types";

const RSS_URL = "https://www.fl.ru/rss/all.xml";

const FL_CATEGORY_MAP: Record<string, number> = {
  "Программирование": 38,
  "Сайты": 37,
  "Mobile": 79,
  "Автоматизация бизнеса": 39,
  "Игры": 40,
};

const FL_SUBCATEGORY_MAP: Record<string, number> = {
  "Bitrix24": 37,
  "1С Битрикс": 37,
  "Joomla": 37,
  "WordPress": 37,
  "Разработка CRM и ERP": 39,
  "Разработка Чат-ботов": 38,
  "Интеграция по API": 38,
  "Плагины/Сценарии/Утилиты": 38,
  "Создание скриптов": 38,
  "Создание MVP": 79,
  "Продвижение в AppStore": 79,
  "Программирование игр": 40,
};

function extractIdFromUrl(url: string): string | null {
  const match = url.match(/\/projects\/(\d+)\//);
  return match ? match[1] : null;
}

function extractBudgetFromTitle(title: string): string | null {
  const match = title.match(/Бюджет:\s*([\d\s]+)\s*(?:₽|&#8381;|руб)/i);
  if (match) {
    return match[1].replace(/\s/g, "").trim();
  }
  return null;
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\(Бюджет:[^)]*\)\s*/gi, "")
    .replace(/\s*\(для всех\)\s*/gi, "")
    .trim();
}

function cleanDescription(html: string): string {
  return html
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

function mapFlCategory(fullCategory: string): number {
  const parts = fullCategory.split("/").map((s) => s.trim());
  const mainCat = parts[0];
  const subCat = parts[1] || "";

  if (FL_SUBCATEGORY_MAP[subCat]) {
    return FL_SUBCATEGORY_MAP[subCat];
  }
  if (FL_CATEGORY_MAP[mainCat]) {
    return FL_CATEGORY_MAP[mainCat];
  }
  return 0;
}

function isRelevantCategory(fullCategory: string): boolean {
  const kworkId = mapFlCategory(fullCategory);
  return kworkId !== 0;
}

function parseRssItems(xml: string): ParsedProject[] {
  const projects: ParsedProject[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemXml = itemMatch[1];

    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i)
      || itemXml.match(/<title>(.*?)<\/title>/i);
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i);
    const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i)
      || itemXml.match(/<description>(.*?)<\/description>/i);
    const catMatch = itemXml.match(/<category><!\[CDATA\[(.*?)\]\]><\/category>/i)
      || itemXml.match(/<category>(.*?)<\/category>/i);
    const dateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i);

    const rawTitle = titleMatch?.[1]?.trim() || "";
    const link = linkMatch?.[1]?.trim() || "";
    const rawDesc = descMatch?.[1]?.trim() || "";
    const category = catMatch?.[1]?.trim() || "";
    const pubDate = dateMatch?.[1]?.trim() || "";

    if (!rawTitle || !link || !category) continue;

    if (!isRelevantCategory(category)) continue;

    const id = extractIdFromUrl(link);
    if (!id) continue;

    const budget = extractBudgetFromTitle(rawTitle);
    const name = cleanTitle(rawTitle);
    const description = cleanDescription(rawDesc);

    const dateCreate = pubDate ? new Date(pubDate).toISOString() : null;

    projects.push({
      platformId: `fl_${id}`,
      platform: "fl",
      categoryId: mapFlCategory(category),
      name,
      description,
      budget,
      maxDays: null,
      userName: null,
      userRating: null,
      userHiredPercent: null,
      userWantsCount: null,
      userBadges: [],
      url: link,
      viewsCount: null,
      dateCreate,
    });
  }

  return projects;
}

export async function fetchFlRssProjects(): Promise<ParsedProject[]> {
  let xml: string;

  try {
    const res = await fetch(RSS_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RSS Reader)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      next: { revalidate: 300 },
    });

    if (res.ok) {
      xml = await res.text();
    } else {
      throw new Error(`Direct fetch failed: ${res.status}`);
    }
  } catch {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(RSS_URL)}`;
    const res = await fetch(proxyUrl, { next: { revalidate: 300 } });
    if (!res.ok) {
      throw new Error(`FL.ru RSS proxy fetch failed: ${res.status}`);
    }
    xml = await res.text();
  }

  return parseRssItems(xml);
}
