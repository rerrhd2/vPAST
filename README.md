# vPast

Минималистичный тёмный paste-сервис в стиле Apple utility / Raycast / Linear.

Вставьте текст (и/или прикрепите файлы, суммарно до 2 ГБ) → **Новый Past** → получите уникальную ссылку.
Текст — в PostgreSQL, файлы — в приватном Telegram-канале через релей-сервер.

## Возможности

- **Мультиязычность**: EN / RU / UK. Переключатель справа в шапке, выбор запоминается
  в `localStorage` (`vpast.lang`).
- **Несколько файлов, до 2 ГБ суммарно**: кнопка «Attach file» под редактором (или
  drag & drop). Файлы льются из браузера напрямую на релей (VPS), релей складывает их
  в Telegram-канал, а в Past хранятся метаданные + ссылки. Лишние можно убрать по «×».
- **Превью по клику**: в viewer жмите на карточку файла — откроется модалка с
  содержимым — картинки, PDF, тексты (.txt/.md/.json и т.п., до 1 МБ). Для остальных —
  подсказка и Download.
- **Превью Word (.docx), только для чтения**: документ рендерится в модалке с сохранением
  форматирования — жирный/курсив/подчёркивание/зачёркнутый, шрифты и размер, цвет и
  заливка, выравнивание, заголовки, маркированные и нумерованные списки, таблицы,
  гиперссылки. Свой ZIP-парсер + DOMParser (без внешних библиотек).
- **JSON = как в VS Code**: текст, похожий на JSON, в редакторе подсвечивается (палитра
  VS Code Dark+), а кнопка «Форматировать JSON» под редактором делает аккуратную
  индентацию (кнопка видна только когда прикреплён `.json`-файл). Подсветка работает
  и в превью файла, и в основном тексте пасты.
- **Вход Google + почта (magic-ссылка)**: зарегистрированные пользователи получают
  бонусы — файлы хранятся **до 1 года** и доступна приватная видимость пасты. Сессия —
  подписанная HttpOnly-кука `vpast_session` (30 дней). Письмо-баннер с кнопкой/кодом
  отправляется через SMTP (Gmail).
- **Приватность пасты**: select «Кто может смотреть» на главной — `public` (все по ссылке)
  или `private` (только владелец). Приватную пасту может прочитать только залогиненный
  владелец (403 для остальных). Страница **«Мои пасты»** (`/me`) — список своих паст с
  переключением видимости, удалением и датой «до» (1 год).
- **Админ-меню** (серверные API): панель Admin в шапке появляется у пользователей,
  чья почта в env-списке `VPAST_ADMIN_EMAILS` (запятыми). Старые
  cookie/расширение не нужны. Все админ-эндпоинты проверяют сессию и без прав отвечают 403.
- **Сроки жизни файлов**: аноним — файл > 1 ГБ живёт **14 дней**, ≤ 1 ГБ — **3 месяца**;
  у зарегистрированного владельца файлы — **до 1 года**. Текстовые пасты живут вечно
  у всех. После истечения `GET /api/pastes/:id` возвращает 404/410.

## Архитектура

```
Browser ──(текст)──▶ POST /api/pastes ──▶ PostgreSQL (Neon)
Browser ──(GET)────▶ GET  /api/pastes/:id ──▶ vpast.vercel.app (SPA + API)
Browser ──(POST→PUT fallback, ≤2 ГБ)──▶ Relay (VPS :8787) ──▶ Telegram-канал (file_id)
Browser ──(DL)────▶ Relay GET /dl?id=... ──▶ файл из Telegram ──▶ клиент
Browser ──────────▶ POST /api/uploads ──▶ { uploadUrl: "http://<VPS>:8787/up" }
```

Клиент загружает файл **POST**-запросом с fallback на **PUT** (при 405/501) — это
обходит прокси (напр. HF Spaces), которые пропускают POST, но режут/не поддерживают PUT.

Двухступенчатая загрузка нужна, потому что Vercel-функции душат тело запроса на ~4.5 МБ,
а публичный Telegram Bot API — на 50 МБ вверх / 20 МБ вниз. Поэтому на VPS поднимается
**локальный bot API-сервер** (`tdlib/telegram-bot-api`, лимит 2 ГБ), а релей принимает
файлы от браузера и отдаёт их обратно. Секретов в репозитории нет — все токены в env.

## API endpoints

| Method | Path                  | Описание                                          |
|--------|-----------------------|---------------------------------------------------|
| POST   | `/api/pastes`         | Создать Past. Body: `{ "content": "…", "files": [ {…} ], "visibility": "public" }` (или legacy `file`) |
| GET    | `/api/pastes/:id`     | Получить Past. 404 если нет/истёк; 403 если приватная и вы не владелец |
| GET    | `/api/health`         | Проверка API и базы                                 |
| POST   | `/api/uploads`        | Вернуть `uploadUrl` релея (env `RELAY_UPLOAD_URL`) |
| GET    | `/api/auth/me`        | Текущая сессия `{ user?, isAdmin }`                 |
| POST   | `/api/auth/logout`    | Сбросить сессию                                     |
| POST   | `/api/auth/email/request` | Отправить magic-ссылку/код на `{ "email" }`      |
| GET    | `/api/auth/email/callback?t=…` | Вход по ссылке из письма → 302 `/me`       |
| POST   | `/api/auth/email/verify` | Вход по `{ "token" }` (fallback-код)             |
| GET    | `/api/auth/google/start` | URL для Google OAuth (PKCE)                     |
| GET    | `/api/auth/google/callback` | Обработка OAuth-кода Google → `/me`           |
| GET    | `/api/me/pastes`      | Список паст текущего пользователя                  |
| PATCH  | `/api/me/pastes/:id`  | Сменить видимость `{ "visibility": "private" }`    |
| DELETE | `/api/me/pastes/:id`  | Удалить свою пасту                                 |
| GET    | `/api/admin/stats`    | Статистика хранилища (сессия в `VPAST_ADMIN_EMAILS`) |
| POST   | `/api/admin/delete`   | Удалить Past по `{ "id": "…" }` (та же сессия)     |
| POST   | `/api/admin/clear`    | Полная очистка хранилища (та же сессия)            |
| PUT/POST | `<relay>/up`        | Принять файл ≤ 2 ГБ (POST с fallback на PUT), вернуть метаданные |
| GET    | `<relay>/dl?id=…`     | Отдать файл из Telegram клиенту. `&preview=1` — inline с MIME для превью |

## Локальная разработка

`serve.ps1` раздаёт фронтенд и эмулирует весь API, включая загрузку файлов
(`POST /api/uploads` → `POST`/`PUT /api/upload-file`, файлы в `data/files/`).

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8080
# открыть http://localhost:8080
```

Аутентификация для проверки: в DevTools выполни
`fetch("/api/auth/devlogin?email=me@x.test&name=Tester", { credentials: "include" }).then(() => location.reload())` —
в шапке появится аккаунт и панель Admin (в dev-режиме админ = любой залогиненный, если
`VPAST_ADMIN_EMAILS` не задан). Magic-ссылка для e-mail в dev-режиме возвращается в
ответе `/api/auth/email/request` как `devLink` (SMTP не обязателен).

## Настройка авторизации (Google + почта)

### 1. Google OAuth (кнопка «Продолжить через Google»)
1. Открой [Google Cloud Console](https://console.cloud.google.com/) → выбери проект
   (или создай новый).
2. **APIs & Services → OAuth consent screen**: External, заполни App name, email,
   добавь scope `../auth/userinfo.email`, `../auth/userinfo.profile`.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   тип **Web application**. В **Authorized redirect URIs** добавь:
   ```
   https://<твой-домен>.vercel.app/api/auth/google/callback
   ```
4. Скопируй **Client ID** и **Client Secret** → в Vercel env:
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

### 2. Gmail для magic-ссылок (SMTP)
1. Включи **2-Step Verification** в аккаунте Gmail.
2. [myaccount.google.com → Security → App passwords](https://myaccount.google.com/apppasswords) →
   «Other (Custom name)» → например `vpast` → сгенерируй пароль из 16 символов.
   (Обычный пароль Gmail для SMTP не работает.)
3. В Vercel env:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=vpast.mail@gmail.com
   SMTP_PASS=<app password, 16 символов>
   SMTP_FROM="vPast <vpast.mail@gmail.com>"
   ```

### 3. Остальные env для Vercel (Production)
```
VPAST_AUTH_SECRET=<длинная случайная строка>   # обязателен: подпись сессий и magic-токенов
VPAST_ORIGIN=https://<твой-домен>.vercel.app   # для redirect_uri Google и ссылок в письмах
VPAST_ADMIN_EMAILS=you@gmail.com,other@gmail.com  # почты админов (можно пусто в dev)
DATABASE_URL=postgres://…   # Neon
RELAY_UPLOAD_URL=https://<space>.hf.space/up
```
⚠️ `VPAST_AUTH_SECRET`, `SMTP_PASS`, `GOOGLE_CLIENT_SECRET` и токены релея не коммить —
только в env на Vercel.

## Развёртывание релея (Hugging Face Space, без карты)

Релею нужен публичный URL, который принимает PUT-запросы из браузера. Проще всего —
бесплатный Docker-спейс на Hugging Face (2 vCPU / 16 ГБ / 50 ГБ эфемерный диск).

⚠️ Ограничения бесплатного Space:
- засыпает через **48 ч** без трафика — релей сам пингует `/health` каждые 6 ч;
- диск **эфемерный**: после перезапуска контейнера старые файлы в канале Telegram
  остаются, но релей забывает их `file_id` → старые ссылки `/dl` отдают 404
  (пасты с хранением на предыдущем контейнере «умирают»);
- лимит тела запроса через прокси HF не документирован — проверь на файле ~100–300 МБ
  перед расчётом на 2 ГБ.

1. Создай бота у `@BotFather` → токен. Приватный канал, бота админом, id канала
   (формат `-100…`).
2. Заведи аккаунт Hugging Face (без карты) → `+ New Space`:
   - SDK: **Docker**, hardware: **CPU basic** (бесплатно), тип: **Public** (не Gated),
     архитектура: **amd64**.
3. В `Settings → Variables and secrets` добавь:
   ```
   TELEGRAM_BOT_TOKEN=123:ABC…
   TELEGRAM_CHAT_ID=-100…
   RELAY_PUBLIC_URL=https://<твое-имя>-<space>.hf.space
   RELAY_PORT=7860
   ```
4. Загрузи в этот Space: `relay/relay.js`, `relay/entrypoint.sh`, `relay/Dockerfile`
   (файлы коммитятся в Git-репозиторий Space — обычным пушем или через веб-UI Files → Add file).
   Space сам соберёт Docker-образ и запустит релей.
5. Проверь: `curl https://<space>.hf.space/health` → `{"ok":true}`.
6. На Vercel добавь env **`RELAY_UPLOAD_URL=https://<space>.hf.space/up`** (Production) → Redeploy.

Запасной вариант — обычный VPS (`relay/bootstrap.sh`): ставит Node + локальный
bot API-сервер и поднимает оба systemd-сервиса. Токены — только в env на машине.

## Деплой vPast на Vercel

Репозиторий на GitHub; Vercel деплоит автоматически после пуша в `main`. Правки — через
веб-редактор GitHub или `git push`.

1. Создай базу PostgreSQL (Neon) → env `DATABASE_URL` (Production).
2. Добавь env `RELAY_UPLOAD_URL` (см. выше) + секции «Настройка авторизации».
3. Redeploy (Deployments → ⋯ → Redeploy) для применения env.

Таблицы `pastes` и `users` создаются автоматически (`CREATE TABLE IF NOT EXISTS` + `ALTER TABLE …`).

## Устройство кода

```
api/                      serverless functions
  health.js               GET  /api/health
  pastes.js               POST /api/pastes (текст + метаданные файла, ≤ 2 ГБ, owner/visibility)
  pastes/[id].js          GET  /api/pastes/:id (+ истечение файлов, private-гейт 403)
  uploads.js              POST /api/uploads (url релея из RELAY_UPLOAD_URL)
  auth/me.js              GET  /api/auth/me (сессия + isAdmin)
  auth/logout.js          POST /api/auth/logout
  auth/email/*.js         request / callback / verify (magic-ссылка, лимит токена 15 мин)
  auth/google/*.js        start / callback (OAuth + PKCE)
  me/pastes.js            GET  /api/me/pastes (пасты пользователя)
  me/pastes/[id].js       PATCH видимость / DELETE (только владелец)
  admin/stats.js          GET  /api/admin/stats (сессия: email в VPAST_ADMIN_EMAILS)
  admin/delete.js         POST /api/admin/delete { id }
  admin/clear.js          POST /api/admin/clear
lib/
  db.js                   PostgreSQL pool + schema + queries
  session.js              HMAC-сессии (base64url токены), signToken/verifyToken
  google.js               Google OAuth: PKCE-auth URL + обмен кода на пользователя
  mail.js                 SMTP (nodemailer): письмо-баннер с кнопкой/кодом
  admin.js                проверка админа: валидная сессия + VPAST_ADMIN_EMAILS
  id.js                   генерация уникальных ID
  helpers.js              JSON-обёртки, readJsonBody (лимит 4 МБ)
relay/
  relay.js                релей: PUT/POST /up + GET /dl, стриминг, CORS, keep-alive
  Dockerfile              сборка под Hugging Face Space (tg-bot-api + relay)
  entrypoint.sh           старт bot API-сервера (local, 2 ГБ) + релея
  bootstrap.sh            альтернатива: установка на VPS (systemd)
  .env.example            шаблон секретов (не коммитить токены!)
src/
  app.js                  вход; пинг /api/health, выбор режима
  auth.js                 auth-стор + модалка входа (Google/email, fallback-код)
  i18n.js                 словари EN/RU/UK, t()/tpl(), сохранение языка
  store.js                data-layer: fetch к API, fallback localStorage
  router.js               маршруты /, /p/:id и /me
  blobUpload.js           upload файла: POST → PUT fallback, прогресс
  jsonHighlight.js        подсветка и автоформат JSON (палитра VS Code Dark+)
  docxRender.js           рендер .docx в HTML (свой ZIP + DOMParser, без библиотек)
  admin.js                админ-меню: статистика, удаление, очистка (если isAdmin)
  components/             header (account/admin), homePage (visibility), pasteViewer,
                          myPastes (/me), dynamicIsland, …
serve.ps1                 локальный dev-сервер (статик + JSON API + загрузки + сессии)
```

## Режимы хранения

| Хостинг                          | Режим                  | Описание                                  |
|----------------------------------|------------------------|-------------------------------------------|
| Vercel + DATABASE_URL + Relay    | Серверный (по умолчанию) | текст и метаданные в PostgreSQL, файлы в Telegram |
| GitHub Pages / статика           | Локальный fallback     | `/api/health` недоступен → localStorage   |

На GitHub Pages серверное хранение невозможно в принципе (только статика), файлы тоже недоступны.