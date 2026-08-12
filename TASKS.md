# Задачи CRM MVP

## Шаг 0. Анализ и инициализация ✅
- [x] Инициализация Git-репозитория
- [x] Создание .gitignore
- [x] Создание .dockerignore
- [x] Создание docs/PLAN.md
- [x] Создание docs/ASSUMPTIONS.md
- [x] Создание TASKS.md

## Шаг 1. Инициализация Next.js проекта ✅
- [x] Создание Next.js с App Router, TypeScript
- [x] Настройка Tailwind CSS
- [x] Установка всех зависимостей
- [x] .env.example
- [x] README.md

## Шаг 2. Prisma ✅
- [x] schema.prisma
- [x] Миграции
- [x] seed.ts
- [x] lib/prisma.ts

## Шаг 3. Docker ✅
- [x] Dockerfile
- [x] docker-compose.yml
- [x] docker-entrypoint.sh
- [x] scripts/cron-worker.mjs
- [x] scripts/healthcheck.mjs
- [x] Health endpoint /api/health

## Шаг 4. Аутентификация ✅
- [x] lib/auth.ts
- [x] /api/auth/login
- [x] /api/auth/logout
- [x] /api/auth/me
- [x] middleware
- [x] /login page

## Шаг 5. Управление пользователями ✅
- [x] /admin/users page
- [x] CRUD API users
- [x] Валидация форм

## Шаг 6. Почтовые ящики ✅
- [x] lib/crypto.ts
- [x] /admin/mailboxes page
- [x] API CRUD mailboxes
- [x] Проверка подключения

## Шаг 7. Email sync ✅
- [x] lib/email-sync.ts
- [x] IMAP синхронизация
- [x] Создание переписок

## Шаг 8. Отправка писем ✅
- [x] lib/email-send.ts
- [x] Reply API
- [x] Threading headers

## Шаг 9. Шаблоны ✅
- [x] lib/templates.ts
- [x] /templates page
- [x] API CRUD templates

## Шаг 10. SLA и уведомления ✅
- [x] lib/sla.ts
- [x] lib/notifications.ts
- [x] Cron endpoint /api/cron/run

## Шаг 11. UI менеджера ✅
- [x] Dashboard
- [x] /conversations
- [x] /conversations/[id]
- [x] /notifications

## Шаг 12. Админский дашборд ✅
- [x] /admin dashboard
- [x] /admin/settings

## Шаг 13. Финальная проверка ✅
- [x] npm run build (успешно)
- [x] ESLint (только предупреждения о deps)
- [x] README актуализирован

## Шаг 14. Интеграция с реальной почтой — runtime-фиксы ✅
- [x] Cookie `secure` зависит от протокола APP_URL, а не NODE_ENV (HTTP-сайт)
- [x] cron-worker.mjs: убран TS-синтаксис из .mjs (крашил cron → синхронизация не работала с первого релиза)
- [x] IMAP-синхронизация переведена с `{ seen: false }` на инкрементальную по UID + `lastSyncedUid`
- [x] SMTP: единый buildSmtpConfig (465/587), логирование ответа, append в «Отправленные», запись lastError
- [x] test-connection: реальная тестовая отправка себе + SMTP-ответ + предупреждение fromEmail≠username
- [x] reply-роут: честные коды ошибок (500 с текстом, не маскировка под 403)
- [x] End-to-end проверка на реальном ящике Яндекса (входящие тянутся, исходящие уходят)
