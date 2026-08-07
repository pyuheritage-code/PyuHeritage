const fs = require('fs');
const path = require('path');
const artifactsModel = require('../../models/admin/artifactsModel');
const artifactStore = require('../../rag/artifactStore');

const list = (req, res) => {
    artifactsModel.getAllArtifacts((err, results) => {
        if (err) {
            console.error('Error fetching artifacts:', err);
            return res.status(500).json({ error: 'Failed to fetch artifacts' });
        }
        res.json(results);
    });
};

const getOne = (req, res) => {
    const id = req.params.id;
    artifactsModel.getArtifactById(id, (err, results) => {
        if (err) {
            console.error('Error fetching artifact:', err);
            return res.status(500).json({ error: 'Failed to fetch artifact' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Artifact not found' });
        }
        res.json(results[0]);
    });
};

const create = (req, res) => {
    const { title, description, category } = req.body;
    const image_url = req.file ? '/uploads/' + req.file.filename : null;

    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
    }

    artifactsModel.createArtifact({ title, description, image_url, category }, (err, result) => {
        if (err) {
            console.error('Error creating artifact:', err);
            return res.status(500).json({ error: 'Failed to create artifact' });
        }
        artifactStore.upsertOne('artifacts', result.insertId, title).catch(e =>
            console.error('Embedding sync error on create:', e.message)
        );
        res.json({ success: true, id: result.insertId, message: 'Artifact created successfully' });
    });
};

const update = (req, res) => {
    const id = req.params.id;
    const { title, description, category } = req.body;
    const newImageUrl = req.file ? '/uploads/' + req.file.filename : null;

    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
    }

    artifactsModel.getArtifactById(id, (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: 'Artifact not found' });
        }

        const existing = results[0];
        const image_url = newImageUrl || existing.image_url;

        if (newImageUrl && existing.image_url) {
            const oldPath = path.join(__dirname, '..', '..', existing.image_url);
            fs.unlink(oldPath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting old image:', unlinkErr);
            });
        }

        artifactsModel.updateArtifact(id, { title, description, image_url, category }, (err, result) => {
            if (err) {
                console.error('Error updating artifact:', err);
                return res.status(500).json({ error: 'Failed to update artifact' });
            }
            artifactStore.upsertOne('artifacts', Number(id), title).catch(e =>
                console.error('Embedding sync error on update:', e.message)
            );
            res.json({ success: true, message: 'Artifact updated successfully' });
        });
    });
};

const remove = (req, res) => {
    const id = req.params.id;

    artifactsModel.getArtifactById(id, (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: 'Artifact not found' });
        }

        const artifact = results[0];

        artifactsModel.deleteArtifact(id, (err, result) => {
            if (err) {
                console.error('Error deleting artifact:', err);
                return res.status(500).json({ error: 'Failed to delete artifact' });
            }

            artifactStore.removeOne('artifacts', Number(id)).catch(e =>
                console.error('Embedding sync error on delete:', e.message)
            );

            if (artifact.image_url) {
                const filePath = path.join(__dirname, '..', '..', artifact.image_url);
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting image file:', unlinkErr);
                });
            }

            res.json({ success: true, message: 'Artifact deleted successfully' });
        });
    });
};

module.exports = {
    list,
    getOne,
    create,
    update,
    remove
};
