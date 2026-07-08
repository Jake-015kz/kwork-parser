"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import DashboardTab from "@/components/DashboardTab";

const ProjectsTab = dynamic(() => import("@/components/ProjectsTab"), { ssr: false });
const ResponsesTab = dynamic(() => import("@/components/ResponsesTab"), { ssr: false });
const SettingsTab = dynamic(() => import("@/components/SettingsTab"), { ssr: false });

const TABS = [
  { key: "dashboard", label: "Дашборд", icon: "📊" },
  { key: "projects", label: "Проекты", icon: "📋" },
  { key: "responses", label: "Отклики", icon: "✏️" },
  { key: "settings", label: "Настройки", icon: "⚙️" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function Home() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [parsing, setParsing] = useState(false);

  const handleParse = async () => {
    setParsing(true);
    await fetch("/api/parse", { method: "POST" });
    setParsing(false);
    window.location.reload();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl md:text-2xl font-bold">📊 Kwork Parser</h1>
        <button
          onClick={handleParse}
          disabled={parsing}
          className="px-4 py-2 bg-[var(--accent)] text-black font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 text-sm"
        >
          {parsing ? "Парсинг..." : "🔄 Запустить парсинг"}
        </button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-[var(--border)] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t.key
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <span className="md:hidden">{t.icon}</span>
            <span className="hidden md:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "projects" && <ProjectsTab />}
      {tab === "responses" && <ResponsesTab />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}
