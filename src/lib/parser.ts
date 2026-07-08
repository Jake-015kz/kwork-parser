export interface KworkProject {
  id: number;
  category_id: string;
  name: string;
  description: string;
  priceLimit: string | null;
  max_days: string | null;
  user: {
    username: string;
    badges: Array<{ badge: { title: string } }>;
    data: {
      wants_count: string;
      wants_hired_percent: string;
    };
  };
  date_create: string;
  date_active: string;
  date_expire: string;
  timeLeft: string;
  views_dirty: string;
  status: string;
}

interface PageData {
  wantsListData: {
    wants: KworkProject[];
    pagination: {
      current_page: number;
      last_page: number;
      next_page_url: string | null;
      total: number;
      per_page: number;
    };
  };
}

interface StateData {
  wantsListData?: {
    wants?: KworkProject[];
    pagination?: {
      current_page: number;
      last_page: number;
      next_page_url: string | null;
      total: number;
      per_page: number;
    };
  };
}

const TARGET_CATEGORIES = new Set([37, 38, 39, 79, 41]);
const BASE_URL = "https://kwork.ru/projects";

function extractJsonObject(html: string, startPos: number): string | null {
  let pos = startPos;
  while (pos < html.length && " \n\r\t".includes(html[pos])) pos++;
  if (html[pos] !== "{") return null;

  let depth = 0;
  const startBrace = pos;

  while (pos < html.length) {
    const ch = html[pos];
    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return html.substring(startBrace, pos + 1);
      }
    } else if (ch === '"') {
      pos++;
      while (pos < html.length) {
        if (html[pos] === "\\" && html[pos + 1] === '"') {
          pos += 2;
        } else if (html[pos] === '"') {
          break;
        } else {
          pos++;
        }
      }
    }
    pos++;
  }

  return null;
}

export function extractPageData(html: string): PageData | null {
  const stateDataIdx = html.indexOf("window.stateData=");
  if (stateDataIdx === -1) return null;

  const jsonStr = extractJsonObject(
    html,
    stateDataIdx + "window.stateData=".length
  );
  if (!jsonStr) return null;

  try {
    const stateData: StateData = JSON.parse(jsonStr);
    if (stateData?.wantsListData?.wants) {
      return stateData as PageData;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchProjectsPage(page: number = 1): Promise<PageData | null> {
  const url = `${BASE_URL}?page=${page}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        + "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ru-RU,ru;q=0.9",
    },
  });

  if (!res.ok) return null;
  const html = await res.text();
  return extractPageData(html);
}

export async function fetchAllProjects(maxPages: number = 10): Promise<KworkProject[]> {
  const all: KworkProject[] = [];
  const seen = new Set<number>();

  for (let page = 1; page <= maxPages; page++) {
    const data = await fetchProjectsPage(page);
    if (!data?.wantsListData?.wants) break;

    for (const want of data.wantsListData.wants) {
      if (!seen.has(want.id) && TARGET_CATEGORIES.has(parseInt(want.category_id))) {
        seen.add(want.id);
        all.push(want);
      }
    }

    if (
      page >= data.wantsListData.pagination.last_page ||
      !data.wantsListData.pagination.next_page_url
    ) {
      break;
    }
  }

  return all;
}

export async function fetchAllCategoriesProjects(maxPages: number = 10): Promise<KworkProject[]> {
  return fetchAllProjects(maxPages);
}
