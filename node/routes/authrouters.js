const express = require('express');
const authrouters = express.Router();
const authController = require('../controllers/site/authController');
const { requireAuth } = require('../middleware/auth');

authrouters.get('/auth/signin', authController.signinPage);
authrouters.post('/auth/signin', authController.signinPost);
authrouters.get('/auth/signup', authController.signupPage);
authrouters.post('/auth/signup', authController.signupPost);
authrouters.get('/auth/google', authController.googleAuth);
authrouters.get('/auth/google/callback', authController.googleCallback);
authrouters.get('/auth/logout', authController.logout);
authrouters.post('/auth/profile/username', requireAuth, authController.changeUsername);

module.exports = authrouters;