const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller.js');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware.js');
// Mở API: GET /api/courses
router.get('/', courseController.getCourses);

// 3. API: Tạo khóa học mới 
// (Chỉ cho phép đi qua nếu: Đã có Token hợp lệ VÀ Role phải là TEACHER hoặc ADMIN)
router.post(
    '/',
    verifyToken,
    requireRole(['TEACHER', 'ADMIN']),
    courseController.createCourse
);

router.get(
    '/mycourse',
    verifyToken,
    requireRole(['STUDENT', 'TEACHER']),
    courseController.getAllCourseByUser
)
router.get('/:id/members', courseController.getMembers);
router.get('/:id/assignments', verifyToken, courseController.getCourseAssignments);

router.get(
    '/:id',
    verifyToken,
    courseController.getCourseDetailById
);


module.exports = router;