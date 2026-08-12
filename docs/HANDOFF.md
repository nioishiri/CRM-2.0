# HANDOFF — CRM 2.0

Краткая «передача контекста» для быстрого старта новой сессии работы (в т.ч. с AI-ассистентом).
Подробности — в `docs/DEVLOG.md`. Задачи — в `TASKS.md`. Личные заметки — в `.dev-notes.md` (вне git).

---

## На каком этапе проект

**MVP полностью реализован и работает в Docker end-to-end.** Все 13 базовых шагов в `TASKS.md` отмечены ✅.
Входящая синхронизация (IMAP) и SMTP-отправка проверены на реальном ящике Яндекса (`janadolgaya@yandex.ru`).

## Что работает

- **Авторизация** (JWT, HTTP-only cookies). Фикс: `secure` зависит от протокола `APP_URL`, а не `NODE_ENV` (раньше cookie отбрасывался на HTTP).
- **CRUD**: пользователи, почтовые ящики, шаблоны, настройки.
- **IMAP-синхронизация** (`lib/email-sync.ts`): инкрементальная по UID. При первом запуске тянет последние 50 писем (`uidNext - 50`), далее — все с `UID > lastSyncedUid`. **Не зависит от флага «прочитано»** (раньше тянула только непрочитанные → прочитанные в веб-почте письма никогда не попадали в CRM). CRM не помечает письма `\Seen`.
- **SMTP-отправка** (`lib/email-send.ts`): единый `buildSmtpConfig` (465 → implicit TLS; 587/25 → STARTTLS + `requireTLS`); полный лог SMTP-ответа (`response`, `accepted`, `rejected`, `envelope`); append копии в «Отправленные» через IMAP; запись ошибок в `mailbox.lastError`.
- **Проверка подключения** (`/api/mailboxes/test-connection`): реальная тестовая отправка себе + возврат SMTP-ответа + предупреждение о `fromEmail ≠ username`.
- **SLA + уведомления**, cron-эндпоинт `/api/cron/run`.
- **Cron-воркер** (`scripts/cron-worker.mjs`): каждые 5 мин вызывает синхронизацию.

## Ключевые баги, исправленные в этой серии сессий

| # | Баг | Фикс |
|---|-----|------|
| 1 | Cookie не сохранялся на HTTP (`secure: NODE_ENV==='production'`) | `secure: isHttps()` по `APP_URL` |
| 2 | **Cron-воркер падал на старте** (`SyntaxError: Unexpected identifier 'as'`) — `.mjs` содержал TS-синтаксис `(error as Error)` и `: number`. Синхронизация **не работала с первого релиза**. | Убран TS из `.mjs` |
| 3 | Синхронизация тянула только непрочитанные (`{ seen: false }`) | UID-based incremental + `lastSyncedUid` |
| 4 | SMTP: нет логов, нет append в «Отправленные», ошибки маскировались под 403 | Диагностика + Sent-append + честные коды ошибок |

## Известные ограничения / боли

- **Яндекс режет SMTP-отправку на часть адресов**: `554 5.7.1 Sending emails to the recipient is restricted`. Это политика Яндекса для конкретных получателей/рассылок (например, ответ на no-reply рассылку) или ограничение нового/неподтверждённого аккаунта. **Не баг кода.** Отправка «себе» и обычным адресатам работает.
- **SMTP `debug: true` шумит в логах** (~60 строк на отправку) и топит `[SYNC]`-строки. Пока не вынесен под env.
- **Входящие в UI показываются только plain text** (`bodyText`), HTML не рендерится (`app/(dashboard)/conversations/[id]/page.tsx:167`).
- **Нет кнопки «Синхронизировать сейчас»** в админке — синхронизация только по cron (5 мин) или ручной node-fetch триггер.
- `curl` отсутствует в slim-образе — ручной триггер через `node -e "fetch(...)"`.

## Что логично делать дальше (приоритеты)

1. Условный SMTP-лог под env `SMTP_DEBUG` (по умолчанию выключен, только итоговая строка).
2. Кнопка «Синхронизировать сейчас» в админке + admin-эндпоинт `/api/mailboxes/sync` (без `CRON_SECRET`).
3. Рендер `bodyHtml` входящих писем (с санитайзом) — сейчас только `bodyText`.
4. При all-rejected получателях не писать письмо в БД как «отправленное» (сейчас пишется).
5. Бэкап БД по расписанию; Telegram-уведомления админу; автозапуск `docker compose` при ребуте; ограничение логов Docker (`daemon.json max-size`).

## Ключевые команды (сервер `docker`, IP 192.168.0.191)

```bash
# Логи приложения / cron
docker compose logs app --tail=80
docker compose logs cron --tail=30

# Фильтр по синхронизации (SMTP-логи шумят — лучше грепать)
docker compose logs app --tail=1000 | grep '\[SYNC\]'

# Ручной запуск синхронизации (curl нет в образе — через node fetch)
docker compose exec app node -e "fetch('http://localhost:3000/api/cron/run',{headers:{'x-cron-secret':process.env.CRON_SECRET}}).then(r=>r.text()).then(console.log).catch(e=>console.error('ERR',e.message))"

# Состояние ящика в БД
docker compose exec db psql -U crm -d crm -c 'select name, username, "lastSyncAt", "lastError", "lastSyncedUid", "isActive" from "Mailbox";'

# Пересборка
docker compose down && docker compose up --build -d
```

## Стек

- Next.js 14 (App Router) + React 18 + TypeScript + Tailwind
- Prisma + PostgreSQL 16
- imapflow (IMAP), nodemailer (SMTP), mailparser
- jose (JWT), bcryptjs
- Docker Compose (app + db + cron)

## Контакты/доступы (см. `.dev-notes.md`)

- Сервер: Proxmox VM Debian 13, 24 ГБ, hostname=docker, IP 192.168.0.191
- Режим: домашний тест (HTTP, не продакшен)
- Ящик: janadolgaya@yandex.ru (Yandex, SMTP 465 SSL/TLS, пароль приложения)
