import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractPageData, fetchAllProjects, TARGET_CATEGORIES } from "@/lib/parser";

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

describe("fetchAllProjects", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("фильтрует по TARGET_CATEGORIES и убирает дубли", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_HTML,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAllProjects(1);
    // только id=111 в целевой категории 37; id=222 категория 99 — отфильтрован
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(111);
    expect(TARGET_CATEGORIES.has(37)).toBe(true);
  });

  it("возвращает [] если запрос не ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAllProjects(1);
    expect(result).toEqual([]);
  });
});
