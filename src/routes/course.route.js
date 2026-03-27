const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');

// Mở API: GET /api/courses
router.get('/', courseController.getCourses);

module.exports = router;