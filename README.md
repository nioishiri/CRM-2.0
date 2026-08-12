# CRM для менеджеров — MVP

CRM-система для отдела продаж: работа с входящими письмами, контроль ответов менеджеров и уведомления администратору при нарушении SLA.

## Возможности MVP

- Авторизация (JWT, HTTP-only cookies)
- Роли: ADMIN и MANAGER
- Подключение почтовых ящиков через IMAP/SMTP
- Автоматическая синхронизация входящих писем
- Работа с обращениями (переписками)
- Ответы на письма из интерфейса CRM
- Шаблоны писем с переменными
- Контроль SLA (время первого ответа)
- Уведомления администратору о просроченных ответах
- Панель контроля нагрузки менеджеров
- Полностью на русском языке

## Технический стек

- **Frontend:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js Route Handlers, Prisma ORM, PostgreSQL
- **Auth:** jose (JWT), bcryptjs, HTTP-only cookies
- **Email:** imapflow (IMAP), nodemailer (SMTP), mailparser
- **UI:** lucide-react (иконки), sonner (toast-уведомления), date-fns (даты)

## Требования

- Node.js 20+
- Docker и Docker Compose
- Git

## Быстрый старт через Docker

```bash
# 1. Клонировать репозиторий
git clone <repo-url>
cd crm-mvp

# 2. Скопировать и заполнить .env
ср .env.example .env

# 3. Сгенерировать ключи (обязательно!)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Вставить сгенерированные ключи в .env:
# AUTH_SECRET=<первый ключ>
# CRON_SECRET=<второй ключ>
# EMAIL_ENCRYPTION_KEY=<третий ключ>

# Также изменить в .env:
# POSTGRES_PASSWORD=<ваш пароль БД>
# ADMIN_PASSWORD=<ваш пароль админа>

# 4. Запустить через Docker
docker compose up --build -d

# 5. Открыть в браузере
# http://localhost:3000
```

## Доступ по умолчанию

| Роль | Email | Пароль (из .env) |
|------|-------|-------------------|
| Админ | `admin@example.com` | `ChangeMe123!` (или ваш ADMIN_PASSWORD) |
| Менеджер | `manager@example.com` | `Manager123!` (если SEED_DEMO_MANAGER=true) |

## Как открыть с другого устройства в локальной сети

1. Узнать локальный IP-адрес машины, где запущен Docker:
   - **Linux:** `hostname -I` или `ip addr`
   - **macOS:** `ipconfig getifaddr en0`
   - **Windows:** `ipconfig`

2. Открыть в браузере на другом устройстве:
   ```
   http://<ВАШ_IP>:3000
   ```
   Например: `http://192.168.1.50:3000`

3. Если не открывается — проверить firewall / брандмауэр и разрешить входящий порт 3000.

## Локальная разработка (без Docker)

```bash
# 1. Установить зависимости
npm install

# 2. Настроить .env (DATABASE_URL на локальный PostgreSQL)
DATABASE_URL=postgresql://crm:password@localhost:5432/crm

# 3. Создать базу и применить миграции
npx prisma migrate dev
npm run db:seed

# 4. Запустить dev-сервер
npm run dev
```

## Подключение почты

1. Войти как админ (`/admin/mailboxes`).
2. Добавить почтовый ящик (IMAP/SMTP). Поля `fromEmail` и `username` должны совпадать — иначе провайдер может тихо отбрасывать письма.
3. Нажать «Проверить подключение» — выполняется реальная тестовая отправка себе и возвращается SMTP-ответ сервера.
4. Cron-сервис автоматически синхронизирует письма каждые 5 минут.

Синхронизация — **инкрементальная по UID** (поле `lastSyncedUid` на ящике): при первом запуске тянутся последние 50 писем, далее — все новые. **Не зависит от флага «прочитано»**, поэтому письма, прочитанные в веб-почте, тоже попадают в CRM. Отправленные через CRM ответы дублируются в папку «Отправленные» через IMAP APPEND.

> Примечание: некоторые провайдеры (в т.ч. Yandex) могут отклонять SMTP-отправку на отдельные адреса политикой `554 5.7.1 ... restricted` (например, ответ на рассылку no-reply). Это ограничение провайдера, а не баг CRM.

### Пример для Gmail
- IMAP: `imap.gmail.com`, порт 993, SSL/TLS
- SMTP: `smtp.gmail.com`, порт 587, SSL/TLS
- Требуется [пароль приложения](https://support.google.com/accounts/answer/185833)

### Пример для Yandex
- IMAP: `imap.yandex.ru`, порт 993, SSL/TLS
- SMTP: `smtp.yandex.ru`, порт 465, SSL/TLS
- Требуется пароль приложения

## Управление SLA

1. Перейти `/admin/settings`.
2. Изменить `sla_response_minutes` (по умолчанию 60 минут).
3. Включить/выключить уведомления администратору.

## Команды npm

| Команда | Описание |
|---------|----------|
| `npm run dev` | Локальная разработка |
| `npm run build` | Сборка приложения |
| `npm run start` | Запуск собранного приложения |
| `npm run lint` | Проверка линтером |
| `npm run db:seed` | Заполнение БД тестовыми данными |
| `npm run docker:up` | Docker Compose up --build |
| `npm run docker:down` | Docker Compose down |
| `npm run docker:logs` | Логи всех контейнеров |

## Команды Docker Compose

```bash
# Запуск
docker compose up --build -d

# Просмотр логов
docker compose logs -f app
docker compose logs -f cron

# Остановка
docker compose down

# Полное удаление (включая данные БД)
docker compose down -v
```

## Ограничения MVP

- Один активный почтовый ящик синхронизируется за раз (можно добавить несколько, но синхронизация последовательная)
- Нет очередей задач (Redis/BullMQ) — используется простой cron
- Нет внутренних заметок к перепискам
- Нет массовых действий с письмами
- Нет Drag & Drop назначения менеджеров
- Нет экспорта данных
- Нет клиентского портала

## Структура проекта

```
.
├── app/                      # Next.js App Router
│   ├── (dashboard)/          # Авторизованные страницы
│   ├── login/                # Страница входа
│   └── api/                  # API endpoints
├── components/
│   ├── ui/                   # Базовые UI-компоненты
│   ├── layout/               # Layout (Sidebar, etc.)
│   ├── conversations/        # Компоненты переписок
│   └── admin/                # Админские компоненты
├── lib/                      # Бизнес-логика
│   ├── auth.ts               # JWT авторизация
│   ├── prisma.ts             # Prisma клиент
│   ├── crypto.ts             # AES-256-GCM шифрование
│   ├── email-sync.ts         # IMAP синхронизация
│   ├── email-send.ts         # SMTP отправка
│   ├── sla.ts                # Проверка SLA
│   ├── templates.ts          # Шаблоны писем
│   └── notifications.ts      # Уведомления
├── prisma/
│   ├── schema.prisma         # Схема БД
│   ├── seed.ts               # Seed-скрипт
│   └── migrations/           # Миграции
├── scripts/
│   ├── cron-worker.mjs        # Фоновый cron-сервис
│   └── healthcheck.mjs        # Healthcheck для Docker
├── Dockerfile                # Сборка приложения
├── Dockerfile.cron           # Сборка cron-сервиса
├── docker-compose.yml        # Docker Compose конфигурация
└── docker-entrypoint.sh      # Точка входа контейнера
```

## Лицензия

MIT