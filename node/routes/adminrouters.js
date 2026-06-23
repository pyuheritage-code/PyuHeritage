const express = require('express');
const adminrouters = express.Router();
const admincontrollers = require('../controllers/admincontrollers');

adminrouters.get('/admin/dashboard', admincontrollers.dashboard);

module.exports = adminrouters;
