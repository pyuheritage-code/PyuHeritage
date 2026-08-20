const path = require('path');
const fs = require('fs');

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

// Stores an uploaded file. In Blob mode (Vercel) it uploads the in-memory
// buffer and returns the public blob URL. Otherwise it relies on multer's
// local disk storage and returns the relative /uploads/... URL.
async function saveFile(file, folder) {
    if (!file) return null;

    if (USE_BLOB && file.buffer) {
        const { put } = require('@vercel/blob');
        const originalName = (file.originalname || 'file-' + Date.now()).replace(/[^\w.\-]+/g, '_');
        const pathname = folder ? `${folder}/${originalName}` : originalName;
        const blob = await put(pathname, file.buffer, {
            access: 'public',
            addRandomSuffix: true,
            contentType: file.mimetype,
        });
        return blob.url;
    }

    return '/uploads/' + (folder ? folder + '/' : '') + file.filename;
}

// Deletes a stored file. Blob URLs are removed via the Blob API, local paths
// via fs.unlink. Never throws.
async function deleteFile(urlOrPath) {
    if (!urlOrPath) return;
    try {
        if (urlOrPath.startsWith('http')) {
            const { del } = require('@vercel/blob');
            await del(urlOrPath);
            return;
        }
        const filePath = path.join(__dirname, '..', urlOrPath);
        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error('Error deleting file:', unlinkErr);
        });
    } catch (err) {
        console.error('Error deleting file:', err.message);
    }
}

module.exports = { saveFile, deleteFile, USE_BLOB };
