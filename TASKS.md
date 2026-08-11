# Задачи CRM MVP

## Шаг 0. Анализ и инициализация
- [x] Инициализация Git-репозитория
- [x] Создание .gitignore
- [x] Создание .dockerignore
- [x] Создание docs/PLAN.md
- [x] Создание docs/ASSUMPTIONS.md
- [x] Создание TASKS.md

## Шаг 1. Инициализация Next.js проекта
- [ ] Создание Next.js с App Router, TypeScript
- [ ] Настройка Tailwind CSS
- [ ] Установка всех зависимостей
- [ ] .env.example
- [ ] README.md (базовая версия)

## Шаг 2. Prisma
- [ ] schema.prisma
- [ ] Миграции
- [ ] seed.ts
- [ ] npm run db:seed

## Шаг 3. Docker
- [ ] Dockerfile
- [ ] docker-compose.yml
- [ ] docker-entrypoint.sh
- [ ] scripts/cron-worker.mjs
- [ ] scripts/healthcheck.mjs
- [ ] Health endpoint /api/health

## Шаг 4. Аутентификация
- [ ] lib/auth.ts
- [ ] /api/auth/login
- [ ] /api/auth/logout
- [ ] /api/auth/me
- [ ] middleware
- [ ] /login page

## Шаг 5. Управление пользователями
- [ ] /admin/users page
- [ ] CRUD API users
- [ ] Валидация форм

## Шаг 6. Почтовые ящики
- [ ] lib/crypto.ts
- [ ] /admin/mailboxes page
- [ ] API CRUD mailboxes
- [ ] Проверка подключения

## Шаг 7. Email sync
- [ ] lib/email-sync.ts
- [ ] IMAP синхронизация
- [ ] Создание переписок

## Шаг 8. Отправка писем
- [ ] lib/email-send.ts
- [ ] Reply API
- [ ] Threading headers

## Шаг 9. Шаблоны
- [ ] lib/templates.ts
- [ ] /templates page
- [ ] API CRUD templates

## Шаг 10. SLA и уведомления
- [ ] lib/sla.ts
- [ ] lib/notifications.ts
- [ ] Cron endpoint /api/cron/run

## Шаг 11. UI менеджера
- [ ] Dashboard
- [ ] /conversations
- [ ] /conversations/[id]
- [ ] /notifications

## Шаг 12. Админский дашборд
- [ ] /admin dashboard
- [ ] /admin/settings

## Шаг 13. Финальная проверка
- [ ] npm run build
- [ ] lint
- [ ] Исправление ошибок
- [ ] Финальный README