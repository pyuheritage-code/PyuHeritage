const axios = require('axios');

const MODEL_NAME = 'Xenova/multilingual-e5-small';
const BATCH_SIZE = 32;
const USE_API_EMBEDDING = process.env.RAG_EMBED_API === 'true';
const EMBED_MODEL = process.env.EMBEDDING_MODEL || 'qwen/qwen3-embedding-8b';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
let extractor = null;

// Local model (dev only) is loaded lazily so the heavy
// @huggingface/transformers package is never loaded on Vercel.
async function getExtractor() {
    if (!extractor) {
        const { pipeline } = require('@huggingface/transformers');
        extractor = await pipeline('feature-extraction', MODEL_NAME);
    }
    return extractor;
}

async function apiEmbed(text) {
    const res = await axios.post('https://openrouter.ai/api/v1/embeddings', {
        model: EMBED_MODEL,
        input: [text],
    }, {
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },
        timeout: 30000,
    });
    return res.data.data[0].embedding;
}

async function apiEmbedBatch(texts) {
    const results = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        const res = await axios.post('https://openrouter.ai/api/v1/embeddings', {
            model: EMBED_MODEL,
            input: batch,
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 60000,
        });
        results.push(...res.data.data.map(d => d.embedding));
    }
    return results;
}

// e5 models are trained with role prefixes for asymmetric retrieval:
// queries => "query: ...", stored passages => "passage: ...".

async function getQueryEmbedding(text) {
    if (USE_API_EMBEDDING) return apiEmbed(text);
    const ex = await getExtractor();
    const result = await ex(`query: ${text}`, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
}

async function getPassageEmbedding(text) {
    if (USE_API_EMBEDDING) return apiEmbed(text);
    const ex = await getExtractor();
    const result = await ex(`passage: ${text}`, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
}

async function getPassageEmbeddings(texts) {
    if (USE_API_EMBEDDING) return apiEmbedBatch(texts);
    const ex = await getExtractor();
    const results = [];
    const total = texts.length;
    for (let i = 0; i < total; i += BATCH_SIZE) {
        if (i % 128 === 0) console.log(`  embedding ${i}/${total}`);
        const batch = texts.slice(i, i + BATCH_SIZE).map(t => `passage: ${t}`);
        const output = await ex(batch, { pooling: 'mean', normalize: true });
        const dim = output.dims[output.dims.length - 1];
        const data = Array.from(output.data);
        for (let j = 0; j < batch.length; j++) {
            results.push(data.slice(j * dim, (j + 1) * dim));
        }
    }
    return results;
}

// Backwards-compatible aliases.
const getEmbedding = getQueryEmbedding;
const getEmbeddings = getPassageEmbeddings;

module.exports = { getEmbedding, getEmbeddings, getQueryEmbedding, getPassageEmbedding, getPassageEmbeddings };