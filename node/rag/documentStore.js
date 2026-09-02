const path = require('path');
const db = require('../config/config');
const pdfLoader = require('./pdfLoader');
const chunker = require('./chunker');
const embedder = require('./embedder');

const INSERT_BATCH = 200;

function cosineSimilarity(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
}

class DocumentStore {
    constructor() {
        this.chunks = [];
        this.embeddings = [];
        this.ready = false;
    }

    async init() {
        await this._syncFromDB();
        if (process.env.RAG_DB_ONLY !== 'true') {
            await this._syncNewFiles();
            await this._syncFromDB();
        }
    }

    async _syncNewFiles() {
        const files = pdfLoader.listSupportedFiles();
        const onDisk = {};
        for (const file of files) {
            onDisk[file] = pdfLoader.computeFileHash(path.join(pdfLoader.DOCUMENTS_DIR, file));
        }

        const registered = await this._fetchRegistered();

        for (const filename of Object.keys(registered)) {
            if (!onDisk[filename]) {
                console.log(`DocumentStore: removing deleted document "${filename}"`);
                await this._deleteFileChunks(filename);
            }
        }

        let indexed = 0;
        for (const filename of Object.keys(onDisk)) {
            const prev = registered[filename];
            if (prev && prev.file_hash === onDisk[filename]) continue;
            if (prev) console.log(`DocumentStore: re-indexing changed document "${filename}"`);
            else console.log(`DocumentStore: indexing new document "${filename}"`);
            await this._indexFile(filename, onDisk[filename]);
            indexed++;
        }
        if (indexed > 0) console.log(`DocumentStore: indexed ${indexed} new/changed file(s)`);
    }

    async _indexFile(filename, fileHash) {
        const filePath = path.join(pdfLoader.DOCUMENTS_DIR, filename);
        const text = await pdfLoader.extractText(filePath);
        const chunks = chunker.chunkDocuments([{ text, filename }]);
        const embeddings = await embedder.getPassageEmbeddings(chunks.map(c => c.text));
        await this._deleteFileChunks(filename);
        await this._insertFileChunks(filename, fileHash, chunks, embeddings);
        console.log(`DocumentStore: ${filename} -> ${chunks.length} chunks indexed`);
    }

    _deleteFileChunks(filename) {
        return new Promise((resolve, reject) => {
            db.query('DELETE FROM document_chunks WHERE source_filename = ?', [filename], (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    async _insertFileChunks(filename, fileHash, chunks, embeddings) {
        const rows = chunks.map((c, i) => [filename, fileHash, i, c.text, JSON.stringify(embeddings[i])]);
        for (let i = 0; i < rows.length; i += INSERT_BATCH) {
            await this._insertBatch(rows.slice(i, i + INSERT_BATCH));
        }
    }

    _insertBatch(rows) {
        return new Promise((resolve, reject) => {
            const placeholders = rows.map(() => '(?, ?, ?, ?, ?)').join(', ');
            const values = rows.flat();
            db.query(
                `INSERT INTO document_chunks (source_filename, file_hash, chunk_index, text, embedding)
                 VALUES ${placeholders}
                 ON DUPLICATE KEY UPDATE file_hash = VALUES(file_hash), text = VALUES(text), embedding = VALUES(embedding)`,
                values,
                (err) => {
                    if (err) return reject(err);
                    resolve();
                }
            );
        });
    }

    _fetchRegistered() {
        return new Promise((resolve, reject) => {
            db.query(
                'SELECT source_filename, file_hash, COUNT(*) AS cnt FROM document_chunks GROUP BY source_filename, file_hash',
                (err, results) => {
                    if (err) return reject(err);
                    const map = {};
                    for (const r of results) map[r.source_filename] = { file_hash: r.file_hash, count: r.cnt };
                    resolve(map);
                }
            );
        });
    }

    _syncFromDB() {
        return new Promise((resolve, reject) => {
            db.query('SELECT source_filename, chunk_index, text, embedding FROM document_chunks', (err, results) => {
                if (err) return reject(err);
                this.chunks = results.map(r => ({
                    source: r.source_filename,
                    chunk_index: r.chunk_index,
                    text: r.text,
                }));
                this.embeddings = results.map(r => JSON.parse(r.embedding));
                this.ready = this.chunks.length > 0;
                if (this.ready) console.log(`DocumentStore loaded ${this.chunks.length} chunks from DB`);
                else console.log('DocumentStore: no chunks in DB');
                resolve();
            });
        });
    }

    search(queryEmbedding, topK = 5) {
        const scored = this.embeddings.map((emb, i) => ({
            score: cosineSimilarity(queryEmbedding, emb),
            chunk: this.chunks[i],
            index: i,
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topK);
    }

    size() {
        return this.chunks.length;
    }

    async syncAll() {
        const files = pdfLoader.listSupportedFiles();
        if (files.length === 0) {
            console.log('DocumentStore: no documents to index');
            return;
        }
        let ok = 0;
        for (const file of files) {
            try {
                await this._indexFile(file, pdfLoader.computeFileHash(path.join(pdfLoader.DOCUMENTS_DIR, file)));
                ok++;
            } catch (err) {
                console.error(`DocumentStore: failed to index "${file}": ${err.message}`);
            }
        }
        await this._syncFromDB();
        console.log(`DocumentStore syncAll complete: ${ok}/${files.length} files, ${this.chunks.length} chunks`);
    }
}

module.exports = new DocumentStore();