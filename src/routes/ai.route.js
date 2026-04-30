const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Áp dụng middleware bảo vệ cho TOÀN BỘ các route ở bên dưới dòng này
router.use(verifyToken);

// Bây giờ tất cả các route này đều đã được bảo vệ nghiêm ngặt! 🛡️
router.get('/sessions', aiController.getUserSessions);
router.post('/session', aiController.createNewSession);
router.get('/history/:sessionId', aiController.getSessionHistory);
router.post('/chat', aiController.handleChat);

module.exports = router;