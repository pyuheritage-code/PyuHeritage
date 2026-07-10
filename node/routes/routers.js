const express = require('express');
const routers = express.Router();
const controllers = require('../controllers/site/siteControllers');
const siteArtifactController = require('../controllers/site/siteArtifactController');
const threeDArtifactController = require('../controllers/site/threeDArtifactController');

routers.get('/', controllers.index);

// chat routes
routers.get('/chat', controllers.chat);
routers.post('/chat', controllers.chatMessage);

// cities routes
routers.get('/history/cities', controllers.cities);
routers.get('/history/religion', controllers.religion);
routers.get('/history/language', controllers.language);
routers.get('/history/culture', controllers.culture);
routers.get('/history/artifacts', siteArtifactController.artifacts);
routers.get('/history/artifacts/3d', threeDArtifactController.threeDArtifacts);

module.exports = routers;