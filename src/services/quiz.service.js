const supabase = require('../config/supabase.js');

const getQuizForTaking = async (quizId, userId) => {
    const { data: checkAttempt } = await supabase
        .from('QuizAttempts')
        .select('id')
        .eq('quiz_id', quizId)
        .eq('user_id', userId)
        .single();

    if (checkAttempt) {
        // Ném lỗi để Controller bắt
        const error = new Error("Bạn đã hoàn thành bài thi này rồi, không thể làm lại!");
        error.status = 403;
        throw error;
    }

    // 1. Lấy thông tin bài Quiz và 40 câu hỏi
    const { data: quiz, error: quizError } = await supabase
        .from('Quizzes')
        .select(`
            id, title, duration_minutes, description,
            Questions (
                id, content, type, points,
                Options ( id, content ) 
            )
        `)
        .eq('id', quizId)
        .single();

    if (quizError) throw quizError;
    return quiz;
};

const submitQuiz = async (quizId, userId, userAnswers) => {
    const { data: checkAttempt } = await supabase
        .from('QuizAttempts')
        .select('id')
        .eq('quiz_id', quizId)
        .eq('user_id', userId)
        .single();

    if (checkAttempt) {
        const error = new Error("Bài thi này đã được nộp trước đó!");
        error.status = 403;
        throw error;
    }

    // 1. Lấy danh sách câu hỏi kèm đáp án đúng
    const { data: questions, error: qError } = await supabase
        .from('Questions')
        .select(`
            id, 
            points,
            Options ( id, is_correct )
        `)
        .eq('quiz_id', quizId);

    if (qError) throw qError;

    let totalScore = 0;
    const studentAnswersRecords = [];

    // 2. Logic Chấm điểm (Đã sửa lại cho chuẩn xác)
    questions.forEach(q => {
        // userAnswers là một object dạng: { question_id: selected_option_id }
        const selectedOptionId = userAnswers[q.id];

        // Tìm đáp án đúng của câu hỏi này
        const correctOption = q.Options.find(opt => opt.is_correct === true);

        let isCorrect = false;
        let pointsAwarded = 0;

        // Nếu người dùng có chọn đáp án VÀ chọn đúng
        if (selectedOptionId && correctOption && selectedOptionId == correctOption.id) {
            isCorrect = true;
            pointsAwarded = q.points || 0;
            totalScore += pointsAwarded;
        }

        // Chuẩn bị dữ liệu để lưu vào bảng StudentAnswers
        studentAnswersRecords.push({
            question_id: q.id,
            selected_option_id: selectedOptionId || null, // Nếu không chọn thì lưu null
            text_answer: null, // Dành cho câu tự luận sau này
            is_correct: isCorrect,
            points_awarded: pointsAwarded // ĐÃ SỬA THÀNH points_awarded CHO KHỚP VỚI DB
        });
    });

    // 3. Lưu vào bảng QuizAttempts
    const { data: attempt, error: attemptError } = await supabase
        .from('QuizAttempts')
        .insert([{
            quiz_id: quizId,
            user_id: userId,
            total_score: totalScore,
            status: 'GRADED',
            started_at: new Date()
        }])
        .select()
        .single();

    if (attemptError) throw attemptError;

    // 4. Gắn attempt_id vào từng câu trả lời và lưu
    const finalAnswers = studentAnswersRecords.map(ans => ({
        ...ans,
        attempt_id: attempt.id
    }));

    const { error: insertAnswersError } = await supabase
        .from('StudentAnswers')
        .insert(finalAnswers);

    if (insertAnswersError) throw insertAnswersError;

    return { score: totalScore, attemptId: attempt.id };
};

module.exports = {
    getQuizForTaking,
    submitQuiz
}