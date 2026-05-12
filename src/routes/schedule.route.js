const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/schedule.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// GET /api/schedule
router.get('/', verifyToken, scheduleController.getSchedule);

module.exports = router;