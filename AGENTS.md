# AGENTS.md — pyu_heritage

## Quick start

```bash
cd node
npm install
# ensure MySQL is running, then:
node database/artifacts.sql      # run schema
node database/three_d_artifacts.sql  # run 3D schema
node database/document_chunks.sql   # run RAG document-chunk schema
node database/users.sql            # run Google auth users schema
node database/chat_history.sql     # run conversations/messages schema
npm start                         # node app.js
```

Server listens on `http://localhost:3003` (PORT in `node/.env`).

## Architecture

- **Express 5** + **EJS** views (`views/site/` public, `views/admin/` dashboard).
- **MySQL** (mysql2 pool) — DB `pyu`, tables: `artifacts` (id, title, description, image_url, category, timestamps) and `three_d_artifacts` (same + model_url, voice_url).
- Two route groups defined in `routes/routers.js` (public) and `routes/adminrouters.js` (admin CRUD, prefix `/admin`).
- Controllers use **callback-style** models (no async/await in DB queries).
- **Auth** (`routes/authrouters.js`, `controllers/site/authController.js`, `middleware/auth.js`): two sign-in methods, both ending in an httpOnly `pyu_token` JWT cookie (7d).
  - **Email/password**: `GET/POST /auth/signin`, `GET/POST /auth/signup` (bcryptjs-hashed passwords, username+email+confirm-password validation; `users` stores `username`, `password_hash`). Pages: `views/site/auth/signin.ejs`, `views/site/auth/signup.ejs`.
  - **Google**: manual OAuth2 (no passport). `GET /auth/google` redirects to Google; `/auth/google/callback` exchanges the code, fetches the profile, upserts a `users` row, and links to an existing local account with the same email if present.
  - `GET /auth/logout` clears the cookie. `POST /auth/profile/username` (JWT-protected via `requireAuth`) changes the username: validates `/^[A-Za-z0-9_]{3,30}$/`, checks uniqueness, updates both `username` and `name`, re-issues the JWT cookie, returns `{ success, name|error }`.
  - `authMiddleware` is global and populates `res.locals.user` for every view. Logged-out navbar shows a single Sign In button → `/auth/signin`; logged-in navbar shows only avatar+name as a dropdown trigger. Shared UI: `views/site/partials/profile-menu.ejs` (desktop dropdown: Change Username / Theme / Logout), `views/site/partials/profile-modal.ejs` (change-username modal + script, included after `</nav>` inside `<% if (user) { %>`), logic in `public/js/profile-menu.js`. Mobile: the hamburger menu holds avatar+name + Change Username + Theme + Logout rows (`mobile-change-username-btn` wired to the same modal). Desktop `theme-toggle` button is hidden when logged in (theme switch lives in the dropdown). Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `JWT_SECRET` in `node/.env`.
- **Chat history** (logged-in users only; guests chat ephemerally as before): `conversations`/`messages` tables (FK cascade), model `models/site/chatModel.js`. `POST /chat` lazily creates a conversation on first message, emits `conversationId` in the first SSE frame, and saves the user + assistant messages on stream end (`rag.queryStream(question, res, { onToken, onDone, onError })`). History APIs: `GET /chat/history`, `GET /chat/conversations/:id`, `DELETE /chat/conversations/:id` (all ownership-checked via `user_id`). `views/site/chat.ejs` renders a sidebar (New chat / list / delete) only when logged in.
- RAG (in `node/rag/`):
  - `documentStore.js` incrementally indexes `rag/documents/` (.pdf + .docx) into MySQL `document_chunks` on startup; only new/changed files are re-extracted/re-embedded (detected by sha1 file hash). Removed files have their chunks deleted.
  - `artifactStore.js` mirrors artifact rows in MySQL `artifact_embeddings` (updated by admin CRUD via `upsertOne`/`removeOne`).
  - `rag/index.js` builds hybrid context from both stores for the LLM chat (`POST /chat`), via OpenRouter.
  - One-time full backfill: `node rag/seedEmbeddings.js`.
  - Embeddings use `intfloat/multilingual-e5-small` (`rag/embedder.js`): passages/chunks prefixed `passage:`, questions prefixed `query:`, 512-token cap (chunk size 1000 chars). E5 handles Myanmar/English cross-lingual similarity.
  - `rag/normalizer.js` converts Zawgyi→Unicode before embedding (statistical detector, model file `rag/resources/zawgyiUnicodeModel.dat`); text already in Unicode passes through unchanged.
- File uploads via multer:
  - Regular artifacts: single `image`, 5 MB limit, accepts jpeg/jpg/png/webp/gif.
  - 3D artifacts: fields `image` + `model` (.glb), 100 MB limit; optional `voice` audio (wav/mp3/ogg/m4a/aac/webm, 100 MB) stored in `uploads/voice/`, saved as `voice_url` on the row. The site 3D viewer (`views/site/threeDArtifacts.ejs`) auto-plays the voiceover when a model opens (mute/unmute toggle in the header); admin add/edit modal has an optional voice file field (upload replaces the old file, delete removes it).
- `rag/index.js` streams LLM chat answers via OpenRouter (`query`/`queryStream`); `queryStream(question, res, callbacks)` reports tokens/end/error so the controller can persist history.

## Commands

| Command | Action |
|---|---|
| `npm start` | Start Express server |
| `npm test` | No tests configured |

## Key config

- `node/.env` — PORT, DB_USER, DB_PASSWORD, DB_HOST, DB_NAME, Google OAuth creds (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`), `JWT_SECRET`.
- `config/config.js` connects via `mysql2.createPool` using `process.env.DB_HOST`.

## Gotchas

- `.gitignore` excludes `node/node_modules/`, `node/.env`, `node/uploads`, `node/public`, `python/`.
- `models/site/artifactsModel.js` and `controllers/admin/adminThreeDArtifactsControllers.js` are empty/stale files. Do not rely on them.
- No tests, no lint, no typecheck. No CI.
