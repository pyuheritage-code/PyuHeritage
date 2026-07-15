const { pipeline } = require('@huggingface/transformers');

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const BATCH_SIZE = 32;
let extractor = null;

async function getEmbedding(text) {
    if (!extractor) {
        extractor = await pipeline('feature-extraction', MODEL_NAME);
    }
    const result = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
}

async function getEmbeddings(texts) {
    if (!extractor) {
        extractor = await pipeline('feature-extraction', MODEL_NAME);
    }
    const results = [];
    const total = texts.length;
    for (let i = 0; i < total; i += BATCH_SIZE) {
        if (i % 128 === 0) console.log(`  embedding ${i}/${total}`);
        const batch = texts.slice(i, i + BATCH_SIZE);
        const output = await extractor(batch, { pooling: 'mean', normalize: true });
        const dim = output.dims[output.dims.length - 1];
        const data = Array.from(output.data);
        for (let j = 0; j < batch.length; j++) {
            results.push(data.slice(j * dim, (j + 1) * dim));
        }
    }
    return results;
}

module.exports = { getEmbedding, getEmbeddings };
