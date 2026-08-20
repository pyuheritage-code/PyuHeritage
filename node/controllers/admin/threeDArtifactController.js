const threeDArtifactsModel = require('../../models/admin/threeDArtifactsModel');
const artifactStore = require('../../rag/artifactStore');
const { saveFile, deleteFile } = require('../../config/blobStorage');

const list = (req, res) => {
    threeDArtifactsModel.getAll((err, results) => {
        if (err) {
            console.error('Error fetching 3D artifacts:', err);
            return res.status(500).json({ error: 'Failed to fetch 3D artifacts' });
        }
        res.json(results);
    });
};

const getOne = (req, res) => {
    const id = req.params.id;
    threeDArtifactsModel.getById(id, (err, results) => {
        if (err) {
            console.error('Error fetching 3D artifact:', err);
            return res.status(500).json({ error: 'Failed to fetch 3D artifact' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: '3D artifact not found' });
        }
        res.json(results[0]);
    });
};

const create = async (req, res) => {
    const { title, description, category } = req.body;
    let image_url = null;
    let model_url = null;
    let voice_url = null;
    try {
        if (req.files?.image?.[0]) image_url = await saveFile(req.files.image[0], '');
        if (req.files?.model?.[0]) model_url = await saveFile(req.files.model[0], '');
        if (req.files?.voice?.[0]) voice_url = await saveFile(req.files.voice[0], 'voice');
    } catch (e) {
        console.error('Error storing uploaded file:', e.message);
        return res.status(500).json({ error: 'Failed to store uploaded file' });
    }

    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
    }

    threeDArtifactsModel.create({ title, description, image_url, model_url, voice_url, category }, (err, result) => {
        if (err) {
            console.error('Error creating 3D artifact:', err);
            return res.status(500).json({ error: 'Failed to create 3D artifact' });
        }
        artifactStore.upsertOne('three_d_artifacts', result.insertId, title, description, category).catch(e =>
            console.error('Embedding sync error on 3D create:', e.message)
        );
        res.json({ success: true, id: result.insertId, message: '3D artifact created successfully' });
    });
};

const update = async (req, res) => {
    const id = req.params.id;
    const { title, description, category } = req.body;
    let newImageUrl = null;
    let newModelUrl = null;
    let newVoiceUrl = null;
    try {
        if (req.files?.image?.[0]) newImageUrl = await saveFile(req.files.image[0], '');
        if (req.files?.model?.[0]) newModelUrl = await saveFile(req.files.model[0], '');
        if (req.files?.voice?.[0]) newVoiceUrl = await saveFile(req.files.voice[0], 'voice');
    } catch (e) {
        console.error('Error storing uploaded file:', e.message);
        return res.status(500).json({ error: 'Failed to store uploaded file' });
    }

    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
    }

    threeDArtifactsModel.getById(id, (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: '3D artifact not found' });
        }

        const existing = results[0];
        const image_url = newImageUrl || existing.image_url;
        const model_url = newModelUrl || existing.model_url;
        const voice_url = newVoiceUrl || existing.voice_url;

        if (newImageUrl && existing.image_url) deleteFile(existing.image_url);
        if (newModelUrl && existing.model_url) deleteFile(existing.model_url);
        if (newVoiceUrl && existing.voice_url) deleteFile(existing.voice_url);

        threeDArtifactsModel.update(id, { title, description, image_url, model_url, voice_url, category }, (err, result) => {
            if (err) {
                console.error('Error updating 3D artifact:', err);
                return res.status(500).json({ error: 'Failed to update 3D artifact' });
            }
            artifactStore.upsertOne('three_d_artifacts', Number(id), title, description, category).catch(e =>
                console.error('Embedding sync error on 3D update:', e.message)
            );
            res.json({ success: true, message: '3D artifact updated successfully' });
        });
    });
};

const remove = (req, res) => {
    const id = req.params.id;

    threeDArtifactsModel.getById(id, (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: '3D artifact not found' });
        }

        const artifact = results[0];

        threeDArtifactsModel.remove(id, (err, result) => {
            if (err) {
                console.error('Error deleting 3D artifact:', err);
                return res.status(500).json({ error: 'Failed to delete 3D artifact' });
            }

            artifactStore.removeOne('three_d_artifacts', Number(id)).catch(e =>
                console.error('Embedding sync error on 3D delete:', e.message)
            );

            deleteFile(artifact.image_url);
            deleteFile(artifact.model_url);
            deleteFile(artifact.voice_url);

            res.json({ success: true, message: '3D artifact deleted successfully' });
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
