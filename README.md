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
  индентацию. Подсветка работает и в превью файла, и в основном тексте пасты.
- **Сроки жизни файлов**: паста с файлом > 1 ГБ живёт **14 дней**, файл ≤ 1 ГБ — **3 месяца**.
  После истечения `GET /api/pastes/:id` возвращает 404. Чистые текстовые пасты живут вечно.

## Архитектура

```
Browser ──(текст)──▶ POST /api/pastes ──▶ PostgreSQL (Neon)
Browser ──(GET)────▶ GET  /api/pastes/:id ──▶ vpast.vercel.app (SPA + API)
Browser ──(PUT, ≤2 ГБ)──▶ Relay (VPS :8787) ──▶ Telegram-канал (file_id)
Browser ──(DL)────▶ Relay GET /dl?id=... ──▶ файл из Telegram ──▶ клиент
Browser ──────────▶ POST /api/uploads ──▶ { uploadUrl: "http://<VPS>:8787/up" }
```

Двухступенчатая загрузка нужна, потому что Vercel-функции душат тело запроса на ~4.5 МБ,
а публичный Telegram Bot API — на 50 МБ вверх / 20 МБ вниз. Поэтому на VPS поднимается
**локальный bot API-сервер** (`tdlib/telegram-bot-api`, лимит 2 ГБ), а релей принимает
файлы от браузера и отдаёт их обратно. Секретов в репозитории нет — все токены в env.

## API endpoints

| Method | Path                  | Описание                                          |
|--------|-----------------------|---------------------------------------------------|
| POST   | `/api/pastes`         | Создать Past. Body: `{ "content": "…", "files": [ {…} ] }` (или legacy `file`) |
| GET    | `/api/pastes/:id`     | Получить Past. 404 если нет или истёк              |
| GET    | `/api/health`         | Проверка API и базы                                 |
| POST   | `/api/uploads`        | Вернуть `uploadUrl` релея (env `RELAY_UPLOAD_URL`) |
| PUT    | `<relay>/up`          | Принять файл ≤ 2 ГБ, загрузить в Telegram, вернуть метаданные |
| GET    | `<relay>/dl?id=…`     | Отдать файл из Telegram клиенту. `&preview=1` — inline с MIME для превью |

## Локальная разработка

`serve.ps1` раздаёт фронтенд и эмулирует весь API, включая загрузку файлов
(`POST /api/uploads` → `PUT /api/upload-file`, файлы в `data/files/`).

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8080
# открыть http://localhost:8080
```

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
2. Добавь env `RELAY_UPLOAD_URL` (см. выше).
3. Redeploy (Deployments → ⋯ → Redeploy) для применения env.

Таблица `pastes` создаётся автоматически (`CREATE TABLE IF NOT EXISTS` + `ALTER TABLE …`).

## Устройство кода

```
api/                      serverless functions
  health.js               GET  /api/health
  pastes.js               POST /api/pastes (текст + метаданные файла, ≤ 2 ГБ)
  pastes/[id].js          GET  /api/pastes/:id (+ истечение файлов)
  uploads.js              POST /api/uploads (url релея из RELAY_UPLOAD_URL)
lib/
  db.js                   PostgreSQL pool + schema + queries
  id.js                   генерация уникальных ID
  helpers.js              JSON-обёртки, readJsonBody (лимит 4 МБ)
relay/
  relay.js                релей: PUT /up + GET /dl, стриминг, CORS, keep-alive
  Dockerfile              сборка под Hugging Face Space (tg-bot-api + relay)
  entrypoint.sh           старт bot API-сервера (local, 2 ГБ) + релея
  bootstrap.sh            альтернатива: установка на VPS (systemd)
  .env.example            шаблон секретов (не коммитить токены!)
src/
  app.js                  вход; пинг /api/health, выбор режима
  i18n.js                 словари EN/RU/UK, t()/tpl(), сохранение языка
  store.js                data-layer: fetch к API, fallback localStorage
  router.js               маршруты / и /p/:id
  blobUpload.js           upload файла: токен → PUT с прогрессом
  jsonHighlight.js        подсветка и автоформат JSON (палитра VS Code Dark+)
  docxRender.js           рендер .docx в HTML (свой ZIP + DOMParser, без библиотек)
  components/             header, homePage, pasteViewer, dynamicIsland, …
serve.ps1                 локальный dev-сервер (статик + JSON API + загрузки)
```

## Режимы хранения

| Хостинг                          | Режим                  | Описание                                  |
|----------------------------------|------------------------|-------------------------------------------|
| Vercel + DATABASE_URL + Relay    | Серверный (по умолчанию) | текст и метаданные в PostgreSQL, файлы в Telegram |
| GitHub Pages / статика           | Локальный fallback     | `/api/health` недоступен → localStorage   |

На GitHub Pages серверное хранение невозможно в принципе (только статика), файлы тоже недоступны.