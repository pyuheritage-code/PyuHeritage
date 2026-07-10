const fs = require('fs');
const path = require('path');
const threeDArtifactsModel = require('../../models/admin/threeDArtifactsModel');

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

const create = (req, res) => {
    const { title, description, category } = req.body;
    const image_url = req.files?.image?.[0] ? '/uploads/' + req.files.image[0].filename : null;
    const model_url = req.files?.model?.[0] ? '/uploads/' + req.files.model[0].filename : null;

    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
    }

    threeDArtifactsModel.create({ title, description, image_url, model_url, category }, (err, result) => {
        if (err) {
            console.error('Error creating 3D artifact:', err);
            return res.status(500).json({ error: 'Failed to create 3D artifact' });
        }
        res.json({ success: true, id: result.insertId, message: '3D artifact created successfully' });
    });
};

const update = (req, res) => {
    const id = req.params.id;
    const { title, description, category } = req.body;
    const newImageUrl = req.files?.image?.[0] ? '/uploads/' + req.files.image[0].filename : null;
    const newModelUrl = req.files?.model?.[0] ? '/uploads/' + req.files.model[0].filename : null;

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

        const deleteFile = (fileUrl) => {
            if (fileUrl) {
                const filePath = path.join(__dirname, '..', '..', fileUrl);
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting file:', unlinkErr);
                });
            }
        };

        if (newImageUrl && existing.image_url) deleteFile(existing.image_url);
        if (newModelUrl && existing.model_url) deleteFile(existing.model_url);

        threeDArtifactsModel.update(id, { title, description, image_url, model_url, category }, (err, result) => {
            if (err) {
                console.error('Error updating 3D artifact:', err);
                return res.status(500).json({ error: 'Failed to update 3D artifact' });
            }
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

            const deleteFile = (fileUrl) => {
                if (fileUrl) {
                    const filePath = path.join(__dirname, '..', '..', fileUrl);
                    fs.unlink(filePath, (unlinkErr) => {
                        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
                    });
                }
            };

            deleteFile(artifact.image_url);
            deleteFile(artifact.model_url);

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
