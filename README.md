# vPast

Минималистичный тёмный paste-сервис в стиле Apple utility / Raycast / Linear.

Вставьте текст → **Новый Past** → получите уникальную ссылку → текст сохраняется на сервере и доступен с любого устройства по открытой ссылке.

## Архитектура

```
Frontend (static SPA)          Serverless API (Vercel)        Storage
   /                      ->   POST /api/pastes        ->    PostgreSQL
   /p/:id                 ->   GET  /api/pastes/:id    ->    (Neon / DATABASE_URL)
   src/…                  ->   GET  /api/health
```

- **Frontend** — чистый vanilla JS (ES modules), без сборки. Публикуется как статика.
- **Backend** — Vercel serverless functions в `api/` (runtime Node.js, `pg` для PostgreSQL).
- **Хранилище** — PostgreSQL, подключение через env-переменную `DATABASE_URL`.
- Данные сохраняются на сервере → переживают перезапуск и доступны с любого устройства.

## API endpoints

| Method | Path                  | Описание                                        |
|--------|-----------------------|-------------------------------------------------|
| POST   | `/api/pastes`         | Создать Past. Body: `{ "content": "текст" }`    |
| GET    | `/api/pastes/:id`     | Получить Past. 404 если не существует            |
| GET    | `/api/health`         | Проверка доступности API и базы                   |

### POST /api/pastes

```json
// запрос
{ "content": "Привет, это тест vPast!" }

// ответ
{ "id": "a8K2xP", "url": "https://<твой-домен>/p/a8K2xP" }
```

### GET /api/pastes/:id

```json
// ответ
{ "id": "a8K2xP", "content": "Привет, это тест vPast!", "created": 1725700000000 }

// если нет
404 { "error": "Past not found" }
```

## Локальная разработка

Сервер на PowerShell (`serve.ps1`) раздаёт фронтенд и эмулирует API через JSON-файл
`data/pastes.json` — с полной логикой создания/получения Past. Данные сохраняются
между перезапусками сервера.

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8080
# открыть http://localhost:8080
```

## Деплой на Vercel (production)

1. Установи Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Создай базу PostgreSQL (Neon, Supabase и т.п.) и получи `DATABASE_URL`.
3. Деплой:
   ```bash
   vercel
   # или сразу в production:
   vercel --prod
   ```
4. Добавь environment variable `DATABASE_URL`:
   ```bash
   vercel env add DATABASE_URL production
   ```
5. Повторный деплой, если добавлял env после:
   ```bash
   vercel --prod
   ```

Таблица `pastes` создаётся автоматически при первом POST (`CREATE TABLE IF NOT EXISTS`).

## Заметки о Vercel Lambda

- Функции в `api/*.js` — Node.js serverless.
- `DATABASE_URL` обязан быть задан, иначе `/api/health` вернёт 500, а фронтенд
  перейдёт в локальный (localStorage) режим.
- `vercel.json` делает SPA-fallback: `/p/:id` отдаёт `index.html`, не затрагивая `/api/*`.

## Устройство кода

```
api/                      serverless functions
  health.js               GET  /api/health
  pastes.js               POST /api/pastes
  pastes/[id].js          GET  /api/pastes/:id
lib/
  db.js                   PostgreSQL pool + schema + queries
  id.js                   генерация уникальных ID
  helpers.js              JSON-обёртки ответов
src/
  app.js                  вход; пинг /api/health, выбор режима
  store.js                data-layer: fetch к API, fallback localStorage
  router.js               маршруты / и /p/:id
  components/             header, editor, dynamicIsland, viewer…
serve.ps1                 локальный dev-сервер (статик + JSON API)
```

## Режимы хранения

| Хостинг                 | Режим             | Описание                                   |
|-------------------------|-------------------|--------------------------------------------|
| Vercel (+ DATABASE_URL) | Серверный (по умолчанию) | текст в PostgreSQL, работает всегда        |
| GitHub Pages / статика  | Локальный fallback| `/api/health` недоступен → localStorage     |

На GitHub Pages серверное хранение невозможно в принципе (только статика), поэтому
там данные живут в браузере.