const db = require('../config/config');
const embedder = require('./embedder');

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

class ArtifactStore {
    constructor() {
        this.items = [];
        this.embeddings = [];
        this.ready = false;
    }

    async init() {
        await this._syncFromDB();
    }

    async _syncFromDB() {
        const rows = await this._fetchAllArtifactsWithEmbeddings();
        this.items = rows.map(r => ({
            source_table: r.source_table,
            source_id: r.source_id,
            title: r.title,
            description: r.description,
            category: r.category,
        }));
        this.embeddings = rows.map(r => JSON.parse(r.embedding));
        this.ready = this.items.length > 0;
        if (this.ready) console.log(`ArtifactStore loaded ${this.items.length} items from DB`);
    }

    _fetchAllArtifactsWithEmbeddings() {
        return new Promise((resolve, reject) => {
            db.query('SELECT source_table, source_id, title, description, category, embedding FROM artifact_embeddings', (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }

    search(queryEmbedding, topK = 5) {
        const scored = this.embeddings.map((emb, i) => ({
            score: cosineSimilarity(queryEmbedding, emb),
            item: this.items[i],
            index: i,
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topK);
    }

    size() {
        return this.items.length;
    }

    async upsertOne(sourceTable, sourceId, title, description, category) {
        const embedding = await embedder.getPassageEmbedding(title);
        const embeddingJson = JSON.stringify(embedding);
        return new Promise((resolve, reject) => {
            db.query(
                `INSERT INTO artifact_embeddings (source_table, source_id, title, description, category, embedding)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), category = VALUES(category), embedding = VALUES(embedding)`,
                [sourceTable, sourceId, title, description || null, category || null, embeddingJson],
                (err) => {
                    if (err) return reject(err);
                    this._syncFromDB().then(resolve).catch(reject);
                }
            );
        });
    }

    async removeOne(sourceTable, sourceId) {
        return new Promise((resolve, reject) => {
            db.query('DELETE FROM artifact_embeddings WHERE source_table = ? AND source_id = ?', [sourceTable, sourceId], (err) => {
                if (err) return reject(err);
                this._syncFromDB().then(resolve).catch(reject);
            });
        });
    }

    async syncAll() {
        const artifacts = await this._fetchFromTable('artifacts');
        const threeD = await this._fetchFromTable('three_d_artifacts');
        const all = [...artifacts, ...threeD];
        for (let i = 0; i < all.length; i++) {
            const item = all[i];
            const embedding = await embedder.getPassageEmbedding(item.title);
            await this._upsertRaw(item.source_table, item.source_id, item.title, item.description, item.category, embedding);
            if ((i + 1) % 10 === 0) console.log(`  embedded ${i + 1}/${all.length}`);
        }
        await this._syncFromDB();
        console.log(`ArtifactStore syncAll complete: ${all.length} items`);
    }

    _fetchFromTable(table) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT id, title, description, category FROM ${table}`, (err, results) => {
                if (err) return reject(err);
                resolve(results.map(r => ({
                    source_table: table,
                    source_id: r.id,
                    title: r.title,
                    description: r.description,
                    category: r.category,
                })));
            });
        });
    }

    _upsertRaw(sourceTable, sourceId, title, description, category, embedding) {
        return new Promise((resolve, reject) => {
            db.query(
                `INSERT INTO artifact_embeddings (source_table, source_id, title, description, category, embedding)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), category = VALUES(category), embedding = VALUES(embedding)`,
                [sourceTable, sourceId, title, description || null, category || null, JSON.stringify(embedding)],
                (err) => {
                    if (err) return reject(err);
                    resolve();
                }
            );
        });
    }
}

module.exports = new ArtifactStore();
