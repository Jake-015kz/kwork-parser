import { describe, it, expect } from "vitest";
import { extractContacts, hasAnyContact, formatContacts } from "@/lib/contacts";

describe("extractContacts", () => {
  it("извлекает @telegram-ник", () => {
    const text = "Пишите в телеграм @ivan_petrov";
    const res = extractContacts(text);
    expect(res.telegram).toContain("ivan_petrov");
  });

  it("извлекает t.me ссылку", () => {
    const text = "Мой tg t.me/cool_dev";
    const res = extractContacts(text);
    expect(res.telegram).toContain("cool_dev");
  });

  it("извлекает email", () => {
    const text = "Почта: test.user@example.com";
    const res = extractContacts(text);
    expect(res.email).toContain("test.user@example.com");
  });

  it("извлекает телефон +7", () => {
    const text = "Звоните +7 900 123 45 67";
    const res = extractContacts(text);
    expect(res.phone.some((p) => p.includes("900"))).toBe(true);
  });

  it("извлекает whatsapp", () => {
    const text = "Ватсапп +79001234567";
    const res = extractContacts(text);
    expect(res.whatsapp.length).toBeGreaterThan(0);
  });

  it("возвращает пустые массивы на пустом тексте", () => {
    const res = extractContacts("");
    expect(res).toEqual({ telegram: [], email: [], whatsapp: [], phone: [] });
  });

  it("hasAnyContact false без контактов", () => {
    expect(hasAnyContact("Просто описание проекта без контактов")).toBe(false);
  });

  it("hasAnyContact true при наличии контакта", () => {
    expect(hasAnyContact("Связь @dev")).toBe(true);
  });

  it("formatContacts добавляет @ к телеграму", () => {
    const res = extractContacts("Пиши @alex");
    const formatted = formatContacts(res);
    expect(formatted).toContain("@alex");
  });
});
