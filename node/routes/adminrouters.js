const express = require('express');
const adminrouters = express.Router();
const admincontrollers = require('../controllers/admin/admincontrollers');
const adminArtifactController = require('../controllers/admin/adminArtifactController');
const threeDArtifactController = require('../controllers/admin/threeDArtifactController');
const { upload, modelUpload } = require('../middleware/upload');

adminrouters.get('/admin/dashboard', admincontrollers.dashboard);

// Artifact CRUD routes
adminrouters.get('/admin/artifacts', adminArtifactController.list);
adminrouters.get('/admin/artifacts/:id', adminArtifactController.getOne);
adminrouters.post('/admin/artifacts', upload.single('image'), adminArtifactController.create);
adminrouters.post('/admin/artifacts/:id', upload.single('image'), adminArtifactController.update);
adminrouters.delete('/admin/artifacts/:id', adminArtifactController.remove);

// 3D Artifact CRUD routes
adminrouters.get('/admin/3d-artifacts', threeDArtifactController.list);
adminrouters.get('/admin/3d-artifacts/:id', threeDArtifactController.getOne);

const modelFields = [
    { name: 'image', maxCount: 1 },
    { name: 'model', maxCount: 1 },
    { name: 'voice', maxCount: 1 }
];

const upload3D = (controller) => (req, res) => {
    modelUpload.fields(modelFields)(req, res, (err) => {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE'
                ? 'File too large. Maximum allowed size is 150MB.'
                : (err.message || 'Upload failed');
            return res.status(413).json({ error: message });
        }
        controller(req, res);
    });
};

adminrouters.post('/admin/3d-artifacts', upload3D(threeDArtifactController.create));
adminrouters.post('/admin/3d-artifacts/:id', upload3D(threeDArtifactController.update));
adminrouters.delete('/admin/3d-artifacts/:id', threeDArtifactController.remove);

module.exports = adminrouters;
