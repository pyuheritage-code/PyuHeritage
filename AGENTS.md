# AGENTS.md — pyu_heritage

## Quick start

```bash
cd node
npm install
# ensure MySQL is running, then:
node database/artifacts.sql      # run schema
node database/three_d_artifacts.sql  # run 3D schema
npm start                         # node app.js
```

Server listens on `http://localhost:3003` (PORT in `node/.env`).

## Architecture

- **Express 5** + **EJS** views (`views/site/` public, `views/admin/` dashboard).
- **MySQL** (mysql2 pool) — DB `pyu`, tables: `artifacts` (id, title, description, image_url, category, timestamps) and `three_d_artifacts` (same + model_url).
- Two route groups defined in `routes/routers.js` (public) and `routes/adminrouters.js` (admin CRUD, prefix `/admin`).
- Controllers use **callback-style** models (no async/await in DB queries).
- File uploads via multer:
  - Regular artifacts: single `image`, 5 MB limit, accepts jpeg/jpg/png/webp/gif.
  - 3D artifacts: fields `image` + `model` (.glb), 100 MB limit.
- Chat (`POST /chat`) proxies to external RAG API at `http://localhost:5000/rag` (60s timeout).

## Commands

| Command | Action |
|---|---|
| `npm start` | Start Express server |
| `npm test` | No tests configured |

## Key config

- `node/.env` — PORT, DB_USER, DB_PASSWORD, DB_HOST, DB_NAME.
- `config/config.js` connects via `mysql2.createPool` using `process.env.HOST` (⛔ note: `.env` key is `DB_HOST`, but config reads `HOST` — currently broken unless both are set).

## Gotchas

- `.gitignore` excludes `node/node_modules/`, `node/.env`, `node/uploads`, `node/public`, `python/`.
- `models/site/artifactsModel.js` and `controllers/admin/adminThreeDArtifactsControllers.js` are empty/stale files. Do not rely on them.
- No tests, no lint, no typecheck. No CI.
