import type { ParsedProject } from "./project-types";

const BASE_URL = "https://www.freelancer.com/jobs/";

// Курс USD->RUB (можно переопределить через env USD_RATE)
const USD_RATE = Number(process.env.USD_RATE) || 90;

// Теги Freelancer -> твои Kwork-категории
const TAG_CATEGORY_MAP: Record<string, number> = {
  // сайты / фронтенд
  website: 37,
  "web-development": 37,
  "html": 79,
  "css": 79,
  "wordpress": 37,
  "shopify": 37,
  "landing-pages": 37,
  "responsive-design": 79,
  // доработка
  "api": 38,
  "api-development": 38,
  "rest-api": 38,
  "integrations": 38,
  // боты / скрипты / парсеры
  "python": 41,
  "automation": 41,
  "data-processing": 41,
  "web-scraping": 41,
  "scripts": 41,
  "chatbot": 41,
  "telegram": 41,
  "bot-development": 41,
  // мобилки
  "mobile-app-development": 39,
  "android": 39,
  "ios": 39,
  "flutter": 39,
  "react-native": 39,
};

function extractBudget(text: string): string | null {
  // Freelancer: "$10 - $30" или "$500"
  const m = text.match(/\$([\d,]+)\s*(?:-\s*\$([\d,]+))?/);
  if (!m) return null;
  const low = parseInt(m[1].replace(/,/g, ""), 10);
  const high = m[2] ? parseInt(m[2].replace(/,/g, ""), 10) : low;
  const avgUsd = Math.round((low + high) / 2);
  return String(Math.round(avgUsd * USD_RATE));
}

function mapTagsToCategory(tags: string[]): number {
  for (const t of tags) {
    const slug = t.replace(/^\/jobs\//, "").replace(/\/$/, "");
    if (TAG_CATEGORY_MAP[slug]) return TAG_CATEGORY_MAP[slug];
  }
  return 0; // не целевая
}

function cleanText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);
}

function parseProjectsFromHtml(html: string): ParsedProject[] {
  const projects: ParsedProject[] = [];
  const seen = new Set<string>();

  // Пойдём по заголовкам-ссылкам (каждая = проект)
  const linkRegex = /<a href="(\/projects\/[^"]+)" class="JobSearchCard-primary-heading-link"[^>]*>([\s\S]*?)<\/a>/gi;
  let linkMatch: RegExpExecArray | null;
  const links: { slug: string; title: string; pos: number }[] = [];

  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const slug = linkMatch[1];
    const title = linkMatch[2].replace(/<[^>]+>/g, "").trim();
    links.push({ slug, title, pos: linkMatch.index });
  }

  for (let i = 0; i < links.length; i++) {
    const { slug, title, pos } = links[i];
    const id = slug.split("/")[2] || slug;
    if (seen.has(id)) continue;
    seen.add(id);

    // контекст карточки: от этого заголовка до следующего
    const end = i + 1 < links.length ? links[i + 1].pos : html.length;
    const ctx = html.slice(pos, end);

    const descMatch = ctx.match(/<p class="JobSearchCard-primary-description">([\s\S]*?)<\/p>/i);
    const description = descMatch ? cleanText(descMatch[1]) : title;

    const priceMatch = ctx.match(/JobSearchCard-primary-price[^>]*>([\s\S]*?)<\/div>/i);
    const budget = priceMatch ? extractBudget(priceMatch[1]) : null;

    // теги
    const tagRegex = /JobSearchCard-primary-tagsLink" href="(\/jobs\/[^/]+\/)"/gi;
    const tags: string[] = [];
    let tm: RegExpExecArray | null;
    while ((tm = tagRegex.exec(ctx)) !== null) tags.push(tm[1]);

    const categoryId = mapTagsToCategory(tags);

    projects.push({
      platformId: `freelancer_${id}`,
      platform: "freelancer",
      categoryId,
      name: title,
      description,
      budget,
      maxDays: null,
      userName: null,
      userRating: null,
      userHiredPercent: null,
      userWantsCount: null,
      userBadges: [],
      url: `https://www.freelancer.com${slug}`,
      viewsCount: null,
      dateCreate: null,
    });
  }

  return projects;
}

export async function fetchFreelancerProjects(): Promise<ParsedProject[]> {
  try {
    const res = await fetch(BASE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`Freelancer fetch failed: ${res.status}`);
      return [];
    }

    const html = await res.text();
    return parseProjectsFromHtml(html);
  } catch (err) {
    console.error("Freelancer fetch error:", err);
    return [];
  }
}
