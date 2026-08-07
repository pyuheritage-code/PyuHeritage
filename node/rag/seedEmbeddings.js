const artifactStore = require('./artifactStore');

(async () => {
    console.log('Starting embedding backfill for all artifacts...');
    try {
        await artifactStore.syncAll();
        console.log('Done. Artifact embeddings stored in MySQL.');
        process.exit(0);
    } catch (err) {
        console.error('Seed error:', err.message);
        process.exit(1);
    }
})();
