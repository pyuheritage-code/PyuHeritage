# PyuHeritage

A web platform for exploring the ancient Pyu cities (ပျူ) of Myanmar — built as a final year project. Users can browse Pyu history, artifacts, and inscriptions, and chat with an AI assistant that answers questions about Pyu heritage in Myanmar (Burmese) using retrieval-augmented generation (RAG).

## Features

- **Heritage pages** — Pyu cities (Sri Ksetra, Halin, Beikthano), religion, language, culture, and the Myazedi inscription
- **Artifact gallery** — browsable catalog of Pyu artifacts with images, managed through the admin panel
- **3D artifacts** — interactive 3D artifact viewer with optional voice narration (`.glb` model + audio)
- **AI chat assistant** — Burmese-language chatbot backed by a hybrid RAG pipeline (indexed PDF/DOCX documents + artifact database), with Zawgyi → Unicode normalization of user input and streaming responses
- **Chat history** — signed-in users get saved conversations; guests can still chat
- **Authentication** — email/password (bcrypt) and Google OAuth, with JWT httpOnly cookie sessions (7 days)
- **Admin panel** — dashboard with CRUD for artifacts (image upload) and 3D artifacts (model + voice upload, up to 150 MB)

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | Node.js, Express 5 |
| Views | EJS (server-rendered) |
| Database | MySQL 8 (`mysql2` connection pool) |
| Auth | JWT cookies, bcryptjs, Google OAuth |
| File uploads | Multer (local disk) / Vercel Blob (production) |
| AI chat | OpenRouter API (DeepSeek chat models) |
| Embeddings | Transformers.js (`Xenova/multilingual-e5-small`) locally, or OpenRouter embedding API |
| Text extraction | `pdf-parse`, `mammoth` (DOCX) |
| Myanmar text | Zawgyi → Unicode conversion (Z2U) |

## Project Structure

```
node/
├── app.js                  # Express entry point
├── PyuDatabase.sql         # MySQL schema + seed data
├── config/
│   ├── config.js           # MySQL connection pool
│   ├── blobStorage.js      # Vercel Blob client (production uploads)
│   └── multerConfig.js     # Multer disk upload configuration
├── controllers/
│   ├── admin/              # Admin panel controllers
│   └── site/               # Public site controllers
├── middleware/
│   ├── auth.js             # JWT cookie auth middleware
│   └── upload.js           # Multer upload middleware
├── models/
│   ├── admin/              # Artifact DB queries
│   └── site/               # User + chat DB queries
├── rag/
│   ├── index.js            # RAG orchestrator (hybrid retrieval + answer generation)
│   ├── documentStore.js    # Document chunk index (cosine similarity search)
│   ├── artifactStore.js    # Artifact embedding index
│   ├── embedder.js         # Local or OpenRouter embedding backends
│   ├── chunker.js          # Chunking (1000 chars, 150 overlap)
│   ├── pdfLoader.js        # File discovery + text extraction (PDF/DOCX)
│   ├── normalizer.js       # Zawgyi → Unicode conversion
│   ├── seedEmbeddings.js   # Artifact embedding seeding
│   ├── documents/          # Drop .pdf/.docx files here (gitignored)
│   └── resources/          # Zawgyi conversion model data
├── routes/                 # Public, auth, and admin route definitions
├── scripts/                # Utility scripts (e.g. blob migration)
├── public/                 # Static assets
├── uploads/                # Local uploads (gitignored)
└── views/
    ├── site/               # Public EJS pages
    └── admin/              # Admin EJS pages
```

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8+
- An [OpenRouter](https://openrouter.ai) API key (for the chat assistant)
- (Optional) Google OAuth credentials, for Google sign-in

### Setup

1. **Install dependencies**

   ```bash
   cd node
   npm install
   ```

2. **Create the database**

   Import `PyuDatabase.sql` into a local MySQL server. The dump creates and populates the `pyu` database (tables: `users`, `artifacts`, `three_d_artifacts`, `conversations`, `messages`, `document_chunks`, `artifact_embeddings`).

   ```bash
   mysql -u root -p < PyuDatabase.sql
   ```

3. **Configure environment variables**

   Copy the example file and fill in your values:

   ```bash
   cp .env.example .env
   ```

   At minimum, set `DB_PASSWORD` and `OPENROUTER_API_KEY`. See the [Environment Variables](#environment-variables) table for all options.

4. **Run the app**

   ```bash
   npm run dev
   ```

   The server listens on [http://localhost:3003](http://localhost:3003) by default (configurable via `PORT` in `.env`).

### Adding knowledge documents (optional)

The chat assistant answers from both the artifact database and any documents you index:

1. Create the folder `node/rag/documents/`
2. Drop in `.pdf` or `.docx` files about the Pyu (Burmese or English)
3. Restart the server — files are extracted, normalized to Unicode, chunked, embedded, and stored in the `document_chunks` table (files are hashed, so re-indexing only happens when a file changes)

The chat works without documents too — it falls back to the artifact database and general knowledge.

## How the RAG Pipeline Works

1. **Indexing** — On startup, documents in `rag/documents/` are extracted with `pdf-parse`/`mammoth`, converted from Zawgyi to Unicode where needed, split into ~1000-character chunks (150-char overlap), embedded, and persisted to MySQL. Artifact titles and descriptions are embedded into `artifact_embeddings`.
2. **Embedding backends** — Locally, embeddings are computed with `@huggingface/transformers` (`Xenova/multilingual-e5-small`). On serverless hosting, set `RAG_EMBED_API=true` to use OpenRouter's embedding API instead.
3. **Retrieval** — A question is normalized and embedded, then matched by cosine similarity against both the document chunks and the artifact embeddings.
4. **Answering** — The top matching context is sent to the chat model (via OpenRouter), which answers in Burmese. Responses stream to the browser via Server-Sent Events.

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Server port | `3003` |
| `DB_USER` / `DB_PASSWORD` | MySQL credentials | `root` / — |
| `DB_HOST` / `DB_PORT` / `DB_NAME` | MySQL connection target | `localhost` / `3306` / `pyu` |
| `DB_SSL` | Set `true` for cloud MySQL hosts | `false` |
| `DB_CONNECTION_LIMIT` | Pool size | `10` |
| `OPENROUTER_API_KEY` | API key from [openrouter.ai](https://openrouter.ai) | — (required for chat) |
| `OPENROUTER_MODEL` | Chat model | `deepseek/deepseek-v4-flash` |
| `OPENROUTER_SITE_URL` / `OPENROUTER_SITE_NAME` | Sent to OpenRouter for attribution | localhost / PyuHeritage |
| `JWT_SECRET` | Secret for signing auth cookies — use a long random string | `insecure_dev_secret` (dev only) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials | — |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | `http://localhost:3003/auth/google/callback` |
| `RAG_DB_ONLY` | Set `true` to load chunks from DB and skip local PDF indexing (serverless) | unset |
| `RAG_EMBED_API` | Set `true` to embed via OpenRouter API instead of the local model | unset |
| `EMBEDDING_MODEL` | OpenRouter embedding model | `qwen/qwen3-embedding-8b` |
| `RAG_SCORE_THRESHOLD` | Cosine similarity cutoff for retrieved chunks | `0.3` (`0.2` with API embeddings) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for production uploads | unset (local disk uploads) |

## Deployment (Vercel)

The app is configured for Vercel deployment:

```bash
npm run deploy
```

Serverless-specific settings:

- Set `RAG_DB_ONLY=true` and `RAG_EMBED_API=true` so the RAG layer loads pre-indexed chunks from MySQL and embeds via API (the heavy local Transformers.js model is never loaded)
- Index documents locally first (run the dev server once with your files in `rag/documents/`), then deploy — the chunks live in MySQL
- Set `BLOB_READ_WRITE_TOKEN` so artifact image/model/voice uploads go to Vercel Blob instead of the ephemeral serverless filesystem
- Set `DB_SSL=true` if using a cloud MySQL provider, and update `GOOGLE_REDIRECT_URI` to your production URL

## Notes

- Admin routes (`/admin/dashboard`, `/admin/artifacts`, ...) currently have **no server-side auth guard** — add authentication before exposing the app publicly.
- All heritage content and the chat assistant are in Myanmar (Burmese).
- This is an educational final year project; content is provided for learning purposes.

