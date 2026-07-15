"use client";

import Link from "next/link";

const STATUS_FILTERS = [
  { key: "all", label: "Все" },
  { key: "analyzed", label: "Готовы" },
  { key: "worth", label: "Стоит взять", filter: "verdict" },
  { key: "maybe", label: "Возможно", filter: "verdict" },
  { key: "hasContact", label: "📱 С контактами", filter: "hasContact" },
  { key: "in_progress", label: "В работе" },
  { key: "new", label: "Новые" },
  { key: "skipped", label: "Пропущено" },
  { key: "blacklisted", label: "В ч/с" },
  { key: "error", label: "Ошибки" },
];

interface Props {
  filter: string;
  setFilter: (f: string) => void;
  search: string;
  setSearch: (s: string) => void;
  platform: string;
  setPlatform: (p: string) => void;
  minBudget: string;
  setMinBudget: (v: string) => void;
  maxBudget: string;
  setMaxBudget: (v: string) => void;
  hasContact: boolean;
  setHasContact: (v: boolean) => void;
}

export { STATUS_FILTERS };

export default function ProjectFilters({
  filter, setFilter, search, setSearch,
  platform, setPlatform, minBudget, setMinBudget, maxBudget, setMaxBudget,
  hasContact, setHasContact,
}: Props) {
  return (
    <>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              if (f.filter === "hasContact") {
                setHasContact(!hasContact);
                setFilter("all");
              } else {
                setFilter(f.key);
                setHasContact(false);
              }
            }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors whitespace-nowrap ${
              (f.filter === "hasContact" && hasContact) || filter === f.key
                ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Поиск по названию..."
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:border-[var(--accent)]"
        />
        <div className="flex gap-2">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="all">Все платформы</option>
            <option value="kwork">Kwork</option>
            <option value="fl">FL.ru</option>
          </select>
          <input
            type="number"
            value={minBudget}
            onChange={(e) => setMinBudget(e.target.value)}
            placeholder="Бюджет от"
            className="w-full sm:w-28 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <input
            type="number"
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
            placeholder="до"
            className="w-full sm:w-28 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <Link
            href="/api/projects/export"
            className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors whitespace-nowrap"
          >
            📥 CSV
          </Link>
        </div>
      </div>
    </>
  );
}
