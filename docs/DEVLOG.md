# DEVLOG — CRM 2.0

Этот файл ведётся в процессе разработки. Сюда записываются ключевые события, решения и исправленные проблемы. Цель — сохранить контекст для будущих сессий работы (в том числе с AI-ассистентами).

## Как вести этот файл

- Новые записи добавляются СВЕРХУ (самые свежие сверху)
- Каждая запись имеет дату и краткий заголовок
- Формат: что было сделано / какая проблема / как решили
- Без личных данных и секретов (для этого есть .dev-notes.md)

---

## Шаблон записи

### YYYY-MM-DD — Краткий заголовок

**Что сделано:**
- пункт 1
- пункт 2

**Проблемы:**
- описание проблемы

**Решение:**
- как исправили

**Изменённые файлы:**
- file1
- file2

---

## История

### 2026-08-12 — Диагностика и починка отправки писем (SMTP)

**Что сделано:**
- `lib/email-send.ts`: полная переработка отправки
  - Единая функция `buildSmtpConfig()` с корректной логикой `secure`/`requireTLS` (465 → implicit TLS; 587/25 → STARTTLS + `requireTLS:true`)
  - Включён `debug:true` + кастомный `logger` (пишет в stdout с префиксом `[SMTP]`) — теперь весь SMTP-диалог виден в `docker compose logs app`
  - Логируется полный ответ SMTP: `response` (`250 2.0.0 Ok: queued as …`), `messageId`, `accepted`, `rejected`, `envelope`
  - Предупреждение в лог, если `fromEmail ≠ username` (частая причина тихой отбраковки Яндексом)
  - Ошибки отправки сохраняются в `mailbox.lastError` (видно в админке); при успехе `lastError` сбрасывается
  - Копия отправленного письма дополнительно сохраняется в папку «Отправленные» через IMAP APPEND (`ImapFlow`), с поиском папки по флагу `\Sent`/имени/UTF-7 (Яндекс локализует имена). Ошибки append не роняют отправку.
  - Сырой MIME формируется один раз (stream-транспорт) и переиспользуется для SMTP и APPEND — `Message-ID` совпадает везде
- `app/api/mailboxes/test-connection/route.ts`: «Проверка подключения» теперь делает реальную тестовую отправку письма себе (на `username`) и возвращает SMTP-ответ (`response`, `messageId`, `accepted/rejected`) + предупреждение о `fromEmail ≠ username`
- `app/api/conversations/[id]/reply/route.ts`: авторизация отделена от бизнес-логики; реальные ошибки отправки теперь возвращаются как 500 с текстом, а не маскируются под «403 Нет доступа»
- `app/(dashboard)/admin/mailboxes/page.tsx`: в «Проверку подключения» передаётся `fromEmail`; результат показывает отдельно «SMTP (подключение)» и «SMTP (тест. отправка)» + предупреждение

**Проблемы:**
- Письма писались в БД (значит `sendMail` возвращал успех), но не доходили получателю и не появлялись в «Отправленных» Яндекса. Отладка была невозможна: не было ни логов SMTP-ответа, ни записи `lastError`.
- Подозреваемые причины: несовпадение `fromEmail`↔`username`; отсутствие копии в Sent (ожидаемо для SMTP); возможное несовпадение secure/порта.

**Решение:**
- Включено полное логирование SMTP-диалога — первый же лог покажет реальный ответ Яндекса (`queued as …` = принято, или код ошибки).
- Добавлен append в «Отправленные» (через IMAP) — письмо теперь видно в Яндексе.
- Приведена в норму связка порт/secure/requireTLS.
- `tsc --noEmit` и `npm run build` проходят успешно.

**Изменённые файлы:**
- lib/email-send.ts — ключевая переработка
- app/api/mailboxes/test-connection/route.ts — реальная тестовая отправка
- app/api/conversations/[id]/reply/route.ts — честные коды ошибок
- app/(dashboard)/admin/mailboxes/page.tsx — расширенный вывод проверки

**Статус:** код готов; требуется пересборка Docker (`docker compose up --build -d`) и проверка по логам `docker compose logs app` при отправке ответа из CRM.

---

### 2026-08-12 — Исправление авторизации: cookie не сохранялся на HTTP

**Что сделано:**
- Добавлена диагностика: логи в auth.ts, middleware.ts, login-роуте, эндпоинт /api/debug
- По логам подтверждён баг: cookie ставился с `secure: true` на HTTP-сайте
- Исправлена логика `secure` в `lib/auth.ts`
- Убрана вся диагностика после подтверждения фикса

**Проблемы:**
- После логина Set-Cookie приходил, но браузер не сохранял cookie
- Middleware видел `hasCookie: false` → редирект обратно на /login
- Причина: `secure: process.env.NODE_ENV === 'production'` → в Docker `true`, но сайт на HTTP
- RFC 6265: браузер обязан отбрасывать secure-cookie на HTTP-соединении

**Решение:**
- Заменено `secure: process.env.NODE_ENV === 'production'` на `secure: isHttps()` (проверка протокола APP_URL)
- Cookie-опции вынесены в `SESSION_COOKIE_OPTIONS` для консистентности
- JWT и cookie срок увеличен до 7 дней

**Изменённые файлы:**
- lib/auth.ts — ключевой фикс
- app/api/auth/login/route.ts — убраны diagnostic-логи
- middleware.ts — убраны diagnostic-логи
- app/api/debug/route.ts — удалён

### 2026-08-12 — Первичный запуск Docker, исправление ошибок сборки

### 2026-08-12 — Первичный запуск Docker, исправление ошибок сборки

**Что сделано:**
- Первый успешный запуск CRM через docker compose
- Next.js стартует, миграции Prisma применяются

**Проблемы и решения:**

1. **Ошибка: "/app/public": not found при сборке**
   - Решение: создана папка public/ с файлом .gitkeep

2. **Ошибка: prisma_schema_build_bg.wasm not found**
   - Причина: в Dockerfile Stage 3 копировались только части node_modules
   - Решение: заменено на COPY --from=builder /app/node_modules ./node_modules

3. **Ошибка: no space left on device**
   - Причина: закончилось место на диске VPS
   - Решение: расширен диск до 24 ГБ, выполнена очистка docker system prune

4. **Ошибка: Can't write to /app/node_modules/@prisma/engines**
   - Причина: USER nextjs не имел прав на запись в node_modules
   - Решение: в Dockerfile добавлен chown -R nextjs:nodejs /app после всех COPY

5. **Ошибка: Prisma Client could not locate Query Engine for debian-openssl-3.0.x**
   - Причина: binaryTargets не включал debian-openssl-3.0.x
   - Решение: в prisma/schema.prisma добавлено binaryTargets = ["native", "debian-openssl-3.0.x"]

6. **Проблема: healthcheck не проходит, контейнер unhealthy**
   - Решение: добавлен COPY scripts в Dockerfile, увеличен start_period до 120s

7. **Добавлена система DEVLOG и .dev-notes.md**
   - Созданы docs/DEVLOG.md (в git) и .dev-notes.md (в .gitignore)
   - Цель: сохранять контекст между сессиями AI-ассистента

**Изменённые файлы:**
- Dockerfile
- docker-compose.yml
- docker-entrypoint.sh
- prisma/schema.prisma
- public/.gitkeep
- next.config.mjs
- docs/DEVLOG.md
- .dev-notes.md
- .gitignore

**Статус:** в процессе фикса, ожидание пересборки