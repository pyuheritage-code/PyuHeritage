const { pipeline } = require('@huggingface/transformers');

const MODEL_NAME = 'Xenova/multilingual-e5-small';
const BATCH_SIZE = 32;
let extractor = null;

async function getExtractor() {
    if (!extractor) {
        extractor = await pipeline('feature-extraction', MODEL_NAME);
    }
    return extractor;
}

// e5 models are trained with role prefixes for asymmetric retrieval:
// queries => "query: ...", stored passages => "passage: ...".

async function getQueryEmbedding(text) {
    const ex = await getExtractor();
    const result = await ex(`query: ${text}`, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
}

async function getPassageEmbedding(text) {
    const ex = await getExtractor();
    const result = await ex(`passage: ${text}`, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
}

async function getPassageEmbeddings(texts) {
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