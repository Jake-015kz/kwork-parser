import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractPageData,
  fetchProjectsByCategory,
  fetchProjectsPage,
  TARGET_CATEGORIES,
  TARGET_CATEGORY_IDS,
} from "@/lib/parser";

const SAMPLE_HTML = `window.stateData={"wantsListData":{"wants":[{"id":111,"category_id":"37","name":"Сделать лендинг","description":"Нужен одностраничник","priceLimit":"5000","max_days":"5","user":{"username":"u1","badges":[],"data":{"wants_count":"2","wants_hired_percent":"100"}},"timeLeft":"2 дня","status":"open"},{"id":222,"category_id":"99","name":"Не целевая","description":"другое","priceLimit":null,"max_days":null,"user":{"username":"u2","badges":[],"data":{"wants_count":"1","wants_hired_percent":"50"}},"timeLeft":"1 день","status":"open"}],"pagination":{"current_page":1,"last_page":1,"next_page_url":null,"total":2,"per_page":20}}}`;

describe("extractPageData", () => {
  it("парсит window.stateData", () => {
    const data = extractPageData(SAMPLE_HTML);
    expect(data).not.toBeNull();
    expect(data!.wantsListData.wants).toHaveLength(2);
    expect(data!.wantsListData.wants[0].id).toBe(111);
  });

  it("возвращает null если нет stateData", () => {
    expect(extractPageData("<html>нет данных</html>")).toBeNull();
  });

  it("возвращает null если нет wants", () => {
    const html = `window.stateData={"wantsListData":{}}`;
    expect(extractPageData(html)).toBeNull();
  });
});

describe("TARGET_CATEGORIES", () => {
  it("содержит целевые категории и экспортирует список ID", () => {
    expect(TARGET_CATEGORIES.has(37)).toBe(true);
    expect(TARGET_CATEGORY_IDS).toEqual([37, 38, 39, 79, 41]);
  });
});

describe("fetchProjectsPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("передаёт параметр категории c= в URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_HTML,
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchProjectsPage(1, 37);

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("c=37");
    expect(calledUrl).toContain("page=1");
  });

  it("возвращает [] если запрос не ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    const data = await fetchProjectsPage(1, 37);
    expect(data).toBeNull();
  });
});

describe("fetchProjectsByCategory", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("возвращает все проекты категории без внутреннего фильтра", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_HTML,
    });
    vi.stubGlobal("fetch", fetchMock);

    // SAMPLE_HTML содержит и целевую (37), и нецелевую (99) категорию.
    // fetchProjectsByCategory не фильтрует — возвращает обе.
    const result = await fetchProjectsByCategory(37, 1);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id).sort()).toEqual([111, 222]);
  });

  it("убирает дубли по id внутри категории", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_HTML,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchProjectsByCategory(37, 1);
    const ids = result.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
