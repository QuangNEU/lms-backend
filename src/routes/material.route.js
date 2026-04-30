const express = require('express');
const router = express.Router();
const multer = require('multer');
const materialController = require('../controllers/material.controller');

// Thêm middleware xác thực vào đây
const { verifyToken } = require('../middlewares/auth.middleware');

const upload = multer({ storage: multer.memoryStorage() });

// Áp dụng verifyToken cho tất cả các route của material
router.use(verifyToken);

router.get('/lesson/:lessonId', materialController.getByLesson);
router.post('/upload', upload.single('file'), materialController.upload);
router.delete('/:id', materialController.remove);

module.exports = router;