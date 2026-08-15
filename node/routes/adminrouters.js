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
adminrouters.post('/admin/3d-artifacts', modelUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'model', maxCount: 1 }, { name: 'voice', maxCount: 1 }]), threeDArtifactController.create);
adminrouters.post('/admin/3d-artifacts/:id', modelUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'model', maxCount: 1 }, { name: 'voice', maxCount: 1 }]), threeDArtifactController.update);
adminrouters.delete('/admin/3d-artifacts/:id', threeDArtifactController.remove);

module.exports = adminrouters;
