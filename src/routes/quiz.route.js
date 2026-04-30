const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz.controller');
const { verifyToken } = require('../middlewares/auth.middleware'); // hoặc tên file middleware của bạn

router.get('/:id/take', verifyToken, quizController.getQuizForTaking);
router.post('/:id/submit', verifyToken, quizController.submitQuiz);

module.exports = router;