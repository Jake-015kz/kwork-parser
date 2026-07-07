import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kwork Parser — Dashboard",
  description: "Мониторинг и анализ проектов Kwork с ИИ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <nav className="border-b border-[var(--border)] px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-6">
            <a href="/" className="text-lg font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
              Kwork Parser
            </a>
            <div className="flex gap-4 text-sm">
              <a href="/" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                Главная
              </a>
              <a href="/projects" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                Проекты
              </a>
              <a href="/projects/rejected" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                Отклонённые
              </a>
              <a href="/responses" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                Отклики
              </a>
              <a href="/settings" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                Настройки
              </a>
            </div>
          </div>
        </nav>
        <main className="flex-1 px-6 py-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </body>
    </html>
  );
}
