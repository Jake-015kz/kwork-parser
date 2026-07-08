export interface FlProject {
  id: string;
  title: string;
  description: string;
  budget: string | null;
  category: string;
  categoryName: string;
  url: string;
  dateCreate: string | null;
}

const BASE_URL = "https://www.fl.ru/projects";

const TARGET_CATEGORIES: Record<string, number> = {
  "saity": 37,
  "programmirovanie": 38,
  "is": 39,
  "mobile": 79,
  "ai-iskusstvenniy-intellekt": 41,
  "dizayn": 42,
};

async function fetchFlPage(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        + "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.5",
    },
  });
  if (!res.ok) return null;
  return await res.text();
}

function extractProjectsFromHtml(html: string): FlProject[] {
  const projects: FlProject[] = [];
  const postRegex = /<div[^>]*class="b-post[^"]*"[^>]*data-disposable-project-id="(\d+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
  let match: RegExpExecArray | null;

  while ((match = postRegex.exec(html)) !== null) {
    const id = match[1];
    const block = match[2];

    const titleMatch = block.match(/<a[^>]*class="b-post__title[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
    const priceMatch = block.match(/<div[^>]*class="b-post__price"[^>]*>([^<]*)<\/div>/i);
    const txtMatch = block.match(/<div[^>]*class="b-post__txt"[^>]*>([\s\S]*?)<\/div>/i);
    const catMatch = block.match(/<a[^>]*href="\/projects\/category\/([^/"]+)/i);
    const catNameMatch = block.match(/<div[^>]*class="b-post__anchor__title"[^>]*>([^<]*)<\/div>/i);
    const dateMatch = block.match(/<div[^>]*class="b-post__time"[^>]*>([^<]*)<\/div>/i);

    const title = titleMatch?.[2]?.trim() || "";
    const description = txtMatch?.[1]?.replace(/<[^>]+>/g, "")?.trim() || "";
    const budget = priceMatch?.[1]?.trim() || null;
    const categorySlug = catMatch?.[1] || "other";
    const categoryName = catNameMatch?.[1]?.trim() || categorySlug;
    const urlPath = titleMatch?.[1] || "";
    const dateStr = dateMatch?.[1]?.trim() || "";

    if (title && id) {
      projects.push({
        id,
        title,
        description,
        budget,
        category: categorySlug,
        categoryName,
        url: `https://www.fl.ru${urlPath}`,
        dateCreate: dateStr || null,
      });
    }
  }

  return projects;
}

function extractPaginationInfo(html: string): { totalPages: number; currentPage: number } {
  const totalPagesMatch = html.match(/class="b-pagination__last[^"]*"[^>]*href="[^"]*page=(\d+)/i);
  const currentPageMatch = html.match(/class="b-pagination__active"[^>]*>(\d+)</i);
  return {
    totalPages: totalPagesMatch ? parseInt(totalPagesMatch[1]) : 1,
    currentPage: currentPageMatch ? parseInt(currentPageMatch[1]) : 1,
  };
}

export async function fetchFlProjects(maxPages: number = 5): Promise<FlProject[]> {
  const allProjects: FlProject[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= maxPages; page++) {
    const url = `${BASE_URL}?page=${page}`;
    const html = await fetchFlPage(url);
    if (!html) break;

    const projects = extractProjectsFromHtml(html);
    if (projects.length === 0) break;

    for (const p of projects) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        if (TARGET_CATEGORIES.hasOwnProperty(p.category)) {
          allProjects.push(p);
        }
      }
    }

    const { totalPages } = extractPaginationInfo(html);
    if (page >= totalPages) break;

    await new Promise(r => setTimeout(r, 2000));
  }

  return allProjects;
}

export function mapFlCategoryToKwork(flCategory: string): number {
  return TARGET_CATEGORIES[flCategory] || 0;
}
