const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const DOCUMENTS_DIR = path.join(__dirname, 'documents');

async function loadPDFs() {
    const files = fs.readdirSync(DOCUMENTS_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
    if (files.length === 0) {
        console.warn('No PDF files found in rag/documents/');
        return [];
    }

    const documents = [];
    for (const file of files) {
        const filePath = path.join(DOCUMENTS_DIR, file);
        const buffer = fs.readFileSync(filePath);
        const pdf = new PDFParse({ data: buffer });
        await pdf.load();
        const { text, total } = await pdf.getText();
        documents.push({
            filename: file,
            text,
            numPages: total,
        });
    }
    return documents;
}

module.exports = { loadPDFs };
