const artifactsModel = require('../../models/admin/artifactsModel');
const artifactStore = require('../../rag/artifactStore');
const { saveFile, deleteFile } = require('../../config/blobStorage');

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

const create = async (req, res) => {
    const { title, description, category } = req.body;
    let image_url = null;
    if (req.file) {
        try {
            image_url = await saveFile(req.file, '');
        } catch (e) {
            console.error('Error storing uploaded image:', e.message);
            return res.status(500).json({ error: 'Failed to store uploaded image' });
        }
    }

    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
    }

    artifactsModel.createArtifact({ title, description, image_url, category }, (err, result) => {
        if (err) {
            console.error('Error creating artifact:', err);
            return res.status(500).json({ error: 'Failed to create artifact' });
        }
        artifactStore.upsertOne('artifacts', result.insertId, title, description, category).catch(e =>
            console.error('Embedding sync error on create:', e.message)
        );
        res.json({ success: true, id: result.insertId, message: 'Artifact created successfully' });
    });
};

const update = async (req, res) => {
    const id = req.params.id;
    const { title, description, category } = req.body;
    let newImageUrl = null;
    if (req.file) {
        try {
            newImageUrl = await saveFile(req.file, '');
        } catch (e) {
            console.error('Error storing uploaded image:', e.message);
            return res.status(500).json({ error: 'Failed to store uploaded image' });
        }
    }

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
            deleteFile(existing.image_url);
        }

        artifactsModel.updateArtifact(id, { title, description, image_url, category }, (err, result) => {
            if (err) {
                console.error('Error updating artifact:', err);
                return res.status(500).json({ error: 'Failed to update artifact' });
            }
            artifactStore.upsertOne('artifacts', Number(id), title, description, category).catch(e =>
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
                deleteFile(artifact.image_url);
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
