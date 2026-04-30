const quizService = require('../services/quiz.service.js');

// 1. Hàm lấy đề thi
const getQuizForTaking = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id; // BẮT BUỘC PHẢI CÓ DÒNG NÀY

        // Gọi Service và truyền ĐỦ 2 THAM SỐ
        const quizData = await quizService.getQuizForTaking(id, userId);

        res.json({ success: true, data: quizData });
    } catch (error) {
        // Bắt lỗi từ Service ném ra (ví dụ 403: Đã thi rồi)
        const statusCode = error.status || 500;
        console.error("Lỗi getQuizForTaking:", error.message);
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

// 2. Hàm nộp bài
const submitQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userAnswers = req.body.answers;

        const result = await quizService.submitQuiz(id, userId, userAnswers);

        res.json({ success: true, data: result });
    } catch (error) {
        // Bắt lỗi từ Service ném ra (ví dụ 403: Đã nộp rồi)
        const statusCode = error.status || 500;
        console.error("Lỗi submitQuiz:", error.message);
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

// NHỚ EXPORT CẢ 2 HÀM!
module.exports = {
    getQuizForTaking,
    submitQuiz
};