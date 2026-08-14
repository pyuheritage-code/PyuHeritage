const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

function splitText(text, source) {
    const lines = text.split(/\n\s*\n/);
    const chunks = [];
    let buffer = '';

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (buffer.length + trimmed.length > CHUNK_SIZE && buffer.length > 0) {
            chunks.push({ text: buffer.trim(), source });
            buffer = buffer.slice(-CHUNK_OVERLAP) + '\n\n' + trimmed;
        } else {
            buffer += (buffer ? '\n\n' : '') + trimmed;
        }
    }

    if (buffer.trim()) {
        chunks.push({ text: buffer.trim(), source });
    }

    return chunks;
}

function chunkDocuments(documents) {
    const chunks = [];
    for (const doc of documents) {
        const docChunks = splitText(doc.text, doc.filename);
        chunks.push(...docChunks);
    }
    return chunks;
}

module.exports = { chunkDocuments };
