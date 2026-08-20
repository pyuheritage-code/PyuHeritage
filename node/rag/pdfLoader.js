const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { normalizeToUnicode } = require('./normalizer');

const DOCUMENTS_DIR = path.join(__dirname, 'documents');
const SUPPORTED_EXTS = ['.pdf', '.docx'];

function listSupportedFiles() {
    if (!fs.existsSync(DOCUMENTS_DIR)) {
        console.warn('Documents directory not found: ' + DOCUMENTS_DIR);
        return [];
    }
    return fs.readdirSync(DOCUMENTS_DIR)
        .filter(f => SUPPORTED_EXTS.includes(path.extname(f).toLowerCase()));
}

function computeFileHash(filePath) {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('sha1').update(buffer).digest('hex');
}

async function extractPdf(filePath) {
    const { PDFParse } = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const pdf = new PDFParse({ data: buffer });
    await pdf.load();
    const { text } = await pdf.getText();
    return normalizeToUnicode(text);
}

async function extractDocx(filePath) {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return normalizeToUnicode(result.value || '');
}

async function extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
        return extractPdf(filePath);
    }
    if (ext === '.docx') {
        return extractDocx(filePath);
    }
    throw new Error(`Unsupported document type: ${ext}`);
}

async function loadDocuments() {
    const files = listSupportedFiles();
    if (files.length === 0) {
        console.warn('No supported documents found in rag/documents/');
        return [];
    }

    const documents = [];
    for (const file of files) {
        const filePath = path.join(DOCUMENTS_DIR, file);
        const text = await extractText(filePath);
        documents.push({ filename: file, text });
    }
    return documents;
}

async function loadPDFs() {
    return loadDocuments();
}

module.exports = { DOCUMENTS_DIR, listSupportedFiles, computeFileHash, extractText, loadDocuments, loadPDFs };