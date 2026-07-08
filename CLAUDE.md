@AGENTS.md

### Next.js 16+

Next.js 16 includes its own TypeScript config in `node_modules/next/dist/server/config-shared.js`. The local `tsconfig.json` is the source of truth for your code; ignore the reference warning if it appears.

### Database

Uses Drizzle ORM with PostgreSQL via Neon serverless driver.

### Kwork Parser

Парсер проектов Kwork.ru с ИИ-анализом и Telegram уведомлениями.
- **AI:** Groq API (qwen/qwen3-32b, 500K TPD лимит), GROQ_API_KEY в .env
- **Webhook:** https://parserkwork.vercel.app/api/telegram/webhook
- **Дашборд:** https://parserkwork.vercel.app
- **Парсинг:** POST /api/cron (автоматический по расписанию)
- **Backlog:** POST /api/analyze-backlog (batch обработка ошибок)

### Linting & Typecheck

```bash
npm run lint
npm run typecheck
```
