# План реализации CRM MVP

## Этапы реализации

### Шаг 0. Анализ и инициализация ✅
- Инициализация Git-репозитория
- Создание .gitignore, .dockerignore
- Создание docs/PLAN.md, docs/ASSUMPTIONS.md, TASKS.md

### Шаг 1. Инициализация Next.js проекта и базовые настройки
- Создание Next.js App Router проекта
- TypeScript strict
- Tailwind CSS
- ESLint
- Установка зависимостей
- .env.example
- README.md

### Шаг 2. Prisma схема, миграции, seed
- schema.prisma с сущностями
- Миграции
- Seed с админом, менеджером, настройками

### Шаг 3. Docker
- Dockerfile
- docker-compose.yml
- docker-entrypoint.sh
- scripts/cron-worker.mjs
- healthcheck

### Шаг 4. Аутентификация и роли
- JWT через jose + bcryptjs
- HTTP-only cookies
- Страница /login
- Middleware для проверки сессии и ролей

### Шаг 5. Админка: управление пользователями
- /admin/users
- Создание менеджеров
- Сброс пароля, деактивация

### Шаг 6. Почтовые ящики
- CRUD /admin/mailboxes
- AES-256-GCM шифрование пароля
- Проверка подключения

### Шаг 7. Синхронизация почты (Email Sync)
- IMAP через imapflow
- Разбор через mailparser
- Создание contact/conversation/message
- Дедупликация

### Шаг 8. Отправка писем
- SMTP через nodemailer
- Reply из UI
- Threading headers

### Шаг 9. Шаблоны писем
- CRUD
- Переменные
- Подстановка в ответ

### Шаг 10. SLA и уведомления
- Расчет slaDueAt
- Cron проверка
- Уведомления админу

### Шаг 11. UI менеджера
- Dashboard
- Список переписок
- Детали переписки + ответ
- Шаблоны

### Шаг 12. Админский дашборд
- Просроченные письма
- Нагрузка менеджеров
- Настройки

### Шаг 13. Финальная проверка
- npm run build
- lint
- prisma validate
- Исправление ошибок