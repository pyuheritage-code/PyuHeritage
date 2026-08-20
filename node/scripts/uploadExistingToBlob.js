// One-time helper: uploads every file already in ./uploads to Vercel Blob and
// rewrites the /uploads/... URLs stored in MySQL to the new public blob URLs.
//
// Usage (run locally with your cloud DB + Blob env vars in .env):
//   node scripts/uploadExistingToBlob.js
//
// Requires: BLOB_READ_WRITE_TOKEN + cloud DB credentials (DB_*).

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { put } = require('@vercel/blob');
const db = require('../config/config');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else out.push(full);
    }
    return out;
}

function runQuery(sql, values) {
    return new Promise((resolve, reject) => {
        db.query(sql, values, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

(async () => {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error('BLOB_READ_WRITE_TOKEN is not set in .env');
        process.exit(1);
    }
    if (!process.env.DB_HOST || process.env.DB_HOST === 'localhost') {
        console.error('DB_HOST must point at your cloud database (e.g. PlanetScale), not localhost.');
        process.exit(1);
    }

    const files = walk(UPLOADS_DIR);
    console.log(`Found ${files.length} file(s) in uploads/`);

    const mapping = {};
    for (const file of files) {
        const rel = path.relative(UPLOADS_DIR, file).replace(/\\/g, '/');
        const buffer = fs.readFileSync(file);
        const blob = await put(`uploads/${rel}`, buffer, {
            access: 'public',
            addRandomSuffix: true,
        });
        mapping[`/uploads/${rel}`] = blob.url;
        console.log(`  ${rel} -> ${blob.url}`);
    }

    const keys = Object.keys(mapping);
    if (keys.length === 0) {
        console.log('Nothing to migrate.');
        process.exit(0);
    }

    const placeholders = keys.map(() => '?').join(', ');
    const urlFor = (value) => (value && mapping[value] ? mapping[value] : value);

    const artifacts = await runQuery(`SELECT id, image_url FROM artifacts WHERE image_url IN (${placeholders})`, keys);
    for (const row of artifacts) {
        await runQuery('UPDATE artifacts SET image_url = ? WHERE id = ?', [urlFor(row.image_url), row.id]);
        console.log(`  artifacts#${row.id}: image_url updated`);
    }

    const threeD = await runQuery(
        `SELECT id, image_url, model_url, voice_url FROM three_d_artifacts
         WHERE image_url IN (${placeholders}) OR model_url IN (${placeholders}) OR voice_url IN (${placeholders})`,
        [...keys, ...keys, ...keys]
    );
    for (const row of threeD) {
        await runQuery(
            'UPDATE three_d_artifacts SET image_url = ?, model_url = ?, voice_url = ? WHERE id = ?',
            [urlFor(row.image_url), urlFor(row.model_url), urlFor(row.voice_url), row.id]
        );
        console.log(`  three_d_artifacts#${row.id}: urls updated`);
    }

    console.log('Migration complete.');
    process.exit(0);
})().catch((err) => {
    console.error('Migration error:', err.message);
    process.exit(1);
});