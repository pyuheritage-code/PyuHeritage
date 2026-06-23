const express = require('express');
const routers = express.Router();
const controllers = require('../controllers/controllers');

routers.get('/', controllers.index);

// chat routes
routers.get('/chat', controllers.chat);
routers.post('/chat', controllers.chatMessage);

// cities routes
routers.get('/history/cities', controllers.cities);
routers.get('/history/religion', controllers.religion);
routers.get('/history/language', controllers.language);
routers.get('/history/culture', controllers.culture);
routers.get('/history/artifacts', controllers.artifacts);

module.exports = routers;