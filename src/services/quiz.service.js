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

    // 1. Lấy đáp án ĐÚNG từ Database để đối chiếu
    const { data: correctOptions } = await supabase
        .from('Options')
        .select('id, question_id, is_correct')
        .in('question_id', Object.keys(userAnswers))
        .eq('is_correct', true);

    // 2. Lấy danh sách điểm của từng câu hỏi
    const { data: questions } = await supabase
        .from('Questions')
        .select('id, points')
        .eq('quiz_id', quizId);

    let totalScore = 0;
    const studentAnswersRecords = [];

    // 3. Logic Chấm điểm
    questions.forEach(q => {
        const selectedOptionId = userAnswers[q.id];
        const correctOption = correctOptions.find(opt => opt.question_id === q.id);

        const isCorrect = selectedOptionId == correctOption?.id;
        const scoreEarned = isCorrect ? q.points : 0;

        if (isCorrect) totalScore += scoreEarned;

        // Chuẩn bị dữ liệu để lưu vào bảng StudentAnswers
        studentAnswersRecords.push({
            question_id: q.id,
            selected_option_id: selectedOptionId,
            is_correct: isCorrect,
            score_earned: scoreEarned
        });
    });

    // 4. Lưu vào bảng QuizAttempts (Lần làm bài)
    const { data: attempt, error: attemptError } = await supabase
        .from('QuizAttempts')
        .insert([{
            quiz_id: quizId,
            user_id: userId,
            total_score: totalScore, // SỬA THÀNH: total_score
            status: 'GRADED',        // Viết HOA cho giống chuẩn của bạn
            started_at: new Date()   // Khớp với cột started_at trong DB
        }])
        .select()
        .single();

    if (attemptError) throw attemptError;

    // 5. Lưu chi tiết từng câu vào bảng StudentAnswers
    const finalAnswers = studentAnswersRecords.map(ans => ({
        ...ans,
        attempt_id: attempt.id
    }));

    await supabase.from('StudentAnswers').insert(finalAnswers);

    return { score: totalScore, attemptId: attempt.id };
};

module.exports = {
    getQuizForTaking,
    submitQuiz
}