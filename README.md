<div align="center">

# 🔍 FreelancePulse

**Парсер проектов с Kwork.ru с ИИ-анализом и Telegram уведомлениями**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql)](https://neon.tech/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000?logo=vercel)](https://vercel.app)

[Дашборд](https://parserkwork.vercel.app) • [GitHub](https://github.com/Jake-015kz/kwork-parser)

</div>

---

## 📋 Описание

FreelancePulse — это автоматизированная система мониторинга фриланс-проектов с Kwork.ru. Проект собирает заказы по заданным категориям, анализирует через ИИ (Groq API), фильтрует неподходящие и отправляет готовые отклики в Telegram.

### Возможности

- 🤖 **ИИ-анализ проектов** — автоматическая оценка проектов и генерация откликов
- 📊 **Дашборд** — визуализация статистики с графиками Recharts
- 📱 **Telegram бот** — уведомления с кнопками для управления откликами
- 🔍 **Мультиплатформенность** — поддержка Kwork.ru, Weblancer
- ⚡ **Умная фильтрация** — исключение спама, черного списка, неподходящих категорий
- 🌐 **Расширенный охват** — парсинг каждой целевой категории Kwork отдельно (`?c=<id>`) вместо общей ленты, что даёт в разы больше релевантных заказов
- 📈 **Аналитика** — статистика по проектам, откликам, вердиктам

---

## 🏗 Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                     FreelancePulse                          │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 16)                                      │
│  ├── Dashboard (Recharts)                                   │
│  ├── Projects Tab (фильтры, пагинация)                      │
│  ├── Responses Tab (очередь откликов)                        │
│  └── Settings Tab (настройки)                               │
├─────────────────────────────────────────────────────────────┤
│  Backend (Next.js API Routes)                               │
│  ├── /api/cron — парсинг Kwork (+ Weblancer, Telegram)        │
│  ├── /api/analyze — ИИ-анализ проектов                     │
│  ├── /api/telegram/webhook — обработка команд бота         │
│  └── /api/projects — CRUD проектов                          │
├─────────────────────────────────────────────────────────────┤
│  Services                                                   │
│  ├── Parser (Kwork per-category HTML + Weblancer)               │
│  ├── AI Analyzer (Groq API, qwen/qwen3-32b)                │
│  ├── Telegram Bot (Grammy)                                  │
│  └── Database (Drizzle ORM + PostgreSQL)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠 Технологии

| Категория | Технология | Описание |
|-----------|------------|----------|
| **Frontend** | Next.js 16 | App Router, Server Components |
| | React 19 | UI библиотека |
| | Tailwind CSS 4 | Утилитарные стили |
| | Recharts | Графики и визуализация |
| **Backend** | Next.js API Routes | Serverless функции |
| | Drizzle ORM | Типизированный ORM |
| | PostgreSQL (Neon) | Серверная база данных |
| **AI** | Groq API | Модель qwen/qwen3-32b |
| **Telegram** | Grammy | Bot API фреймворк |
| **Деплой** | Vercel | Автоматический деплой |

---

## 🚀 Быстрый старт

### 1. Клонирование

```bash
git clone https://github.com/Jake-015kz/kwork-parser.git
cd kwork-parser
npm install
```

### 2. Настройка окружения

```bash
cp .env.local.example .env.local
```

Заполните `.env.local`:

```env
# База данных
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require

# AI (Groq)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx

# Telegram бот
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
SITE_URL=https://your-project.vercel.app
```

### 3. Миграция базы

```bash
npm run db:push
```

### 4. Запуск

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

---

## 📖 Использование

### Telegram бот

| Команда | Описание |
|---------|----------|
| `/start` | Привязать чат и начать получать уведомления |
| `/stats` | Посмотреть статистику по проектам |

### API эндпоинты

```bash
# Парсинг проектов (Kwork + Weblancer + Telegram)
curl https://parserkwork.vercel.app/api/cron
# Получение проектов
curl "https://parserkwork.vercel.app/api/projects?limit=10&status=worth"

# Статистика
curl https://parserkwork.vercel.app/api/stats
```

### Команды разработки

```bash
npm run dev          # Запуск dev сервера
npm run build        # Сборка production
npm run lint         # Проверка кода
npm run db:push      # Миграция БД
npm run db:studio    # Drizzle Studio (GUI для БД)
```

---

## 📂 Структура проекта

```
src/
├── app/
│   ├── api/
│   │   ├── cron/route.ts          # Парсинг по расписанию (Kwork + Weblancer + Telegram)
│   │   ├── projects/route.ts      # CRUD проектов
│   │   ├── projects/[id]/route.ts  # Детали проекта
│   │   ├── telegram/webhook/route.ts  # Telegram webhook
│   │   └── stats/route.ts         # Статистика
│   ├── page.tsx                   # Главная (дашборд)
│   └── layout.tsx                 # Layout
├── components/
│   ├── DashboardTab.tsx           # Графики и статистика
│   ├── ProjectsTab.tsx            # Список проектов
│   ├── ResponsesTab.tsx           # Очередь откликов
│   └── SettingsTab.tsx            # Настройки
├── lib/
│   ├── ai.ts                      # Интеграция с Groq API
│   ├── analyzeOne.ts              # Анализ одного проекта
│   ├── db.ts                      # Подключение к БД
│   ├── parser.ts                  # Парсер Kwork.ru (по категориям)
│   ├── prompt.ts                  # Промпты для ИИ
│   ├── runParse.ts                # Оркестратор парсинга
│   ├── telegram.ts                # Telegram уведомления
│   └── project-types.ts           # Типы данных
└── db/
    └── schema.ts                  # Drizzle схема
```

---

## 🎯 Как это работает

### 1. Парсинг проектов

- **Kwork.ru** — HTML парсинг по каждой целевой категории отдельно: `kwork.ru/projects?c=<id>&page=N` для ID 37, 38, 39, 79, 41. Раньше парсилась только общая лента (где целевых категорий единицы на страницу) — переключение на постраничный обход категорий подняло охват в разы.
- **Weblancer** — HTML парсинг по целевым подкатегориям

### 2. Фильтрация

- ✅ Исключение по ключевым словам (黑名单)
- ✅ Фильтрация по категориям
- ✅ Проверка на спам (блок: >10 заказов и 0% найма; skip по скорингу риска)
- ✅ Минимальный бюджет

### 3. ИИ-анализ

- Модель: `qwen/qwen3-32b` через Groq API
- Оценка проекта от 1 до 10
- Вердикт: `worth` / `maybe` / `not_worth`
- Генерация текста отклика

### 4. Уведомления

- Telegram бот отправляет карточки проектов
- Кнопки: «Взял», «Пропустил», «Отклик»
- Копирование текста отклика в буфер

---

## 🔧 Конфигурация

### Категории Kwork

| ID | Название |
|----|----------|
| 37 | Создание сайтов |
| 38 | Доработка сайтов |
| 39 | Мобильные приложения |
| 40 | Игры |
| 41 | Скрипты и боты |
| 79 | Вёрстка |

---

## 📊 Статистика

Дашборд отображает:
- Количество проектов по статусам (new, analyzed, worth, skipped)
- Распределение вердиктов (worth, maybe, not_worth)
- Графики по времени
- Логи синхронизации

---

## 🚢 Деплой

### Vercel

1. Импортируйте репозиторий в Vercel
2. Настройте переменные окружения
3. Деплой автоматический

### Cron

Для автоматического парсинга настройте cron:

```bash
# Каждые 5 минут
*/5 * * * * curl -X GET https://parserkwork.vercel.app/api/cron
```

---

## 📝 Лицензия

MIT License

---

## 👨‍💻 Автор

**Jake** — [@Jake-015kz](https://github.com/Jake-015kz)

---

<div align="center">

**⭐ Если проект полезен, поставьте звезду!**

</div>
