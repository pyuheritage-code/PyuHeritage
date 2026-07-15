const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'cache.json');

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

class VectorStore {
    constructor() {
        this.chunks = [];
        this.embeddings = [];
        this.ready = false;
        this._loadCache();
    }

    add(chunks, embeddings) {
        for (let i = 0; i < chunks.length; i++) {
            if (embeddings[i]) {
                this.chunks.push(chunks[i]);
                this.embeddings.push(embeddings[i]);
            }
        }
        this.ready = this.chunks.length > 0;
        this._saveCache();
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

    _saveCache() {
        try {
            const data = JSON.stringify({ chunks: this.chunks, embeddings: this.embeddings });
            fs.writeFileSync(CACHE_FILE, data);
        } catch (e) {
            console.error('Cache save error:', e.message);
        }
    }

    _loadCache() {
        try {
            if (fs.existsSync(CACHE_FILE)) {
                const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
                this.chunks = data.chunks || [];
                this.embeddings = data.embeddings || [];
                this.ready = this.chunks.length > 0;
                if (this.ready) console.log(`Loaded ${this.chunks.length} cached chunks`);
            }
        } catch (e) {
            console.error('Cache load error:', e.message);
        }
    }
}

module.exports = new VectorStore();
