"use client";

import { buildProjectUrl } from "@/lib/utils";
import { extractContacts, formatContacts } from "@/lib/contacts";

interface AnalysisItem {
  id: number;
  verdict: string;
  score: number;
  reasoning: Record<string, string> | null;
  responseText: string | null;
  responseCost: string | null;
  responseTimeline: string | null;
  createdAt: string;
}

interface ProjectDetail {
  id: number;
  kworkId: number;
  platform: string;
  categoryId: number;
  name: string;
  description: string;
  priceLimit: string | null;
  maxDays: number | null;
  userName: string | null;
  userBadges: string[];
  userHiredPercent: number | null;
  userWantsCount: number | null;
  status: string;
  viewsCount: number | null;
  timeLeft: string | null;
  dateCreate: string | null;
  dateExpire: string | null;
  url: string | null;
  createdAt: string;
  analyses: AnalysisItem[];
}

interface Props {
  detail: ProjectDetail;
  onBack: () => void;
  onAnalyze: () => void;
  onGenerateResponse: (projectId: number) => void;
  analyzing: boolean;
  onSubmitToKwork: (projectId: number, kworkId: number, platform?: string, url?: string | null) => void;
  onCopyToClipboard: (text: string) => void;
  copied: boolean;
  generating: boolean;
}

export default function ProjectDetail({ detail, onBack, onAnalyze, onGenerateResponse, analyzing, onSubmitToKwork, onCopyToClipboard, copied, generating }: Props) {
  const latestAnalysis = detail.analyses?.[detail.analyses.length - 1];
  const contacts = extractContacts(detail.description || "");
  const formattedContacts = formatContacts(contacts);

  return (
    <div className="max-w-4xl">
      <button
        onClick={onBack}
        className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-4 inline-block"
      >
        ← Назад к списку
      </button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{detail.name}</h1>
          <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 text-sm text-[var(--muted)]">
            {detail.priceLimit && <span>💰 {detail.priceLimit} ₽</span>}
            {detail.maxDays && <span>⏱ {detail.maxDays} дней</span>}
            {detail.userName && <span>👤 {detail.userName}</span>}
            {detail.timeLeft && <span>⌛ {detail.timeLeft}</span>}
            {detail.viewsCount !== null && <span>👁 {detail.viewsCount}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {formattedContacts.length > 0 && !latestAnalysis?.responseText && (
            <button
              onClick={() => onGenerateResponse(detail.id)}
              disabled={generating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm inline-flex items-center"
            >
              {generating ? "⏳ Генерация..." : "🔄 Сгенерировать ответ"}
            </button>
          )}
          {latestAnalysis?.responseText && (
            <button
              onClick={() => onSubmitToKwork(detail.id, detail.kworkId, detail.platform, detail.url)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm inline-flex items-center"
            >
              {copied ? "✅ Скопировано" : "📤 Отправить отклик"}
            </button>
          )}
          <a
            href={buildProjectUrl(detail.url, detail.platform, detail.kworkId)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] rounded-lg hover:text-[var(--foreground)] transition-colors text-sm inline-flex items-center"
          >
            🔗 {detail.platform === "fl" ? "На FL.ru" : "На Kwork"}
          </a>
          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
          >
            {analyzing ? "Анализ..." : "Анализировать"}
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <h2 className="text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Описание</h2>
          <p className="text-sm whitespace-pre-wrap">{detail.description || "Нет описания"}</p>
        </div>

        {formattedContacts.length > 0 && (
          <div className="p-4 rounded-lg border border-green-400/20 bg-green-400/5">
            <h2 className="text-sm font-semibold text-green-400 mb-2 uppercase">Контакты в описании</h2>
            <div className="flex flex-wrap gap-2">
              {formattedContacts.map((c, i) => (
                <span key={i} className="px-2 py-1 text-xs rounded bg-green-400/10 text-green-400 border border-green-400/20">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {detail.userBadges && detail.userBadges.length > 0 && (
          <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
            <h2 className="text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Бейджи заказчика</h2>
            <div className="flex flex-wrap gap-2">
              {(detail.userBadges as string[]).map((badge, i) => (
                <span key={i} className="px-2 py-1 text-xs rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        )}

        {latestAnalysis && (
          <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
            <h2 className="text-sm font-semibold text-[var(--muted)] mb-2 uppercase">
              AI-анализ
              <span className="ml-2 text-xs font-normal">
                {latestAnalysis.verdict === "worth" ? "✅" : latestAnalysis.verdict === "maybe" ? "🤔" : "❌"}
                {latestAnalysis.verdict} ({latestAnalysis.score}/10)
              </span>
            </h2>
            {latestAnalysis.reasoning && (
              <div className="text-sm space-y-1 mt-2">
                {Object.entries(latestAnalysis.reasoning as Record<string, string>).map(([key, val]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-[var(--muted)] capitalize min-w-20">{key}:</span>
                    <span>{val}</span>
                  </div>
                ))}
              </div>
            )}
            {latestAnalysis.responseText && (
              <div className="mt-3 p-3 rounded bg-[var(--background)] border border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-[var(--muted)] uppercase">Сгенерированный отклик</h3>
                  <button
                    onClick={() => latestAnalysis.responseText && onCopyToClipboard(latestAnalysis.responseText)}
                    className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-black font-medium hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    {copied ? "✅ Скопировано" : "📋 Копировать"}
                  </button>
                </div>
                {latestAnalysis.responseCost && (
                  <div className="text-sm mb-1">
                    <span className="text-[var(--muted)]">💰 Стоимость:</span>{" "}
                    <span className="font-medium">{latestAnalysis.responseCost}</span>
                  </div>
                )}
                {latestAnalysis.responseTimeline && (
                  <div className="text-sm mb-2">
                    <span className="text-[var(--muted)]">⏱ Срок:</span>{" "}
                    <span className="font-medium">{latestAnalysis.responseTimeline}</span>
                  </div>
                )}
                <pre className="text-sm whitespace-pre-wrap font-sans">{latestAnalysis.responseText}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
