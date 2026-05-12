// Import supabase client
const supabase = require('../config/supabase');

const getStudentQuizzesSchedule = async (userId) => {
    // 1. Lấy danh sách course_id mà sinh viên đã ghi danh
    const { data: enrollments, error: enrollError } = await supabase
        .from('Enrollment')
        .select('course_id')
        .eq('user_id', userId); // Thay tên cột user_id/student_id cho đúng với DB của bạn

    if (enrollError) throw new Error(enrollError.message);

    // Nếu chưa đăng ký môn nào thì trả về mảng rỗng luôn
    if (!enrollments || enrollments.length === 0) return [];

    const courseIds = enrollments.map(e => e.course_id);

    // 2. Lấy danh sách Quizzes thuộc các môn đó
    const { data: quizzes, error: quizError } = await supabase
        .from('Quizzes')
        // Nhớ join với bảng Course để lấy tên môn học hiển thị lên lịch
        .select(`
            id, 
            title, 
            start_time, 
            due_date, 
            duration_minutes,
            course_id,
            Course ( course_code, course_name )
        `)
        .in('course_id', courseIds);

    if (quizError) throw new Error(quizError.message);

    return quizzes;
};

module.exports = { getStudentQuizzesSchedule };