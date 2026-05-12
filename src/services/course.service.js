const supabase = require('../config/supabase.js');

const getAllCourses = async () => {
    const { data, error } = await supabase
        .from('Course')
        .select('*')

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

// Thay thế hàm getAllCourseByUser cũ
const getAllCourseByUser = async (userId) => {
    // Truy vấn từ bảng Enrollment để lấy được cột last_accessed_at
    const { data, error } = await supabase
        .from('Enrollment')
        .select(`
            last_accessed_at,
            Course (
                *,
                teacher:User!Course_teacher_id_fkey ( full_name )
            )
        `)
        .eq('user_id', userId)
        // Sắp xếp truy cập gần nhất lên đầu. Các khóa chưa học bao giờ (NULL) đẩy xuống cuối cùng
        .order('last_accessed_at', { ascending: false, nullsFirst: false });

    if (error) {
        console.error("Lỗi ở getAllCourseByUser:", error);
        throw new Error(error.message);
    }

    // Nhào nặn lại cục Data cho giống cấu trúc cũ để Frontend (React) không bị lỗi
    const formattedData = data.map(item => ({
        ...item.Course,
        last_accessed_at: item.last_accessed_at
    }));

    return formattedData;
}

const updateLastAccess = async (userId, courseId) => {
    console.log(`[Service] Đang cập nhật cho User: ${userId}, Course: ${courseId}`);

    const { data, error } = await supabase
        .from('Enrollment')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .select(); // Thêm .select() để bắt Supabase trả về dòng vừa update

    if (error) {
        console.error('[Service] Lỗi Supabase:', error);
        return false;
    }

    if (data && data.length === 0) {
        console.log('[Service] Cảnh báo: Không tìm thấy dòng nào trong DB để update! (Có thể do User chưa Enroll hoặc sai ID)');
        return false;
    }

    return true;
}


const createCourse = async (courseData) => {
    const { data, error } = await supabase
        .from('Course')
        .insert([courseData])
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

const getCourseDetailById = async (id) => {
    const { data, error } = await supabase
        .from('Course')
        .select(`*
        ,User!Course_teacher_id_fkey(id,full_name,email,avatar_url),
        Module(
            id,title,description, order_index,
                Lesson (
                    id, title, content, order_index,
                    Material ( file_url )
                ),
                Quizzes (
                    id, title, duration_minutes, is_ai_generated, order_index
                ),
                Material ( 
                    id, title, file_url 
                )
        )
        `)
        .eq('id', id)
        .single()

    if (error) {
        // In ra màn hình Terminal toàn bộ chi tiết lỗi của Supabase
        console.error('❌ LỖI CHI TIẾT TỪ SUPABASE:', JSON.stringify(error, null, 2));

        // Ném thẳng cái lỗi thật ra Frontend để dễ đọc
        throw new Error(`Lỗi Supabase: ${error.message || error.details}`);
    }
    if (!data) return null;

    const formattedModules = data.Module.map(module => {
        // 1. Lấy Lesson
        const lessonsWithType = module.Lesson.map(l => {
            const attachedFileUrl = l.Material && l.Material.length > 0 ? l.Material[0].file_url : null;
            delete l.Material;
            return { ...l, type: 'lesson', file_url: attachedFileUrl };
        });

        // 2. Lấy Quiz
        const quizzesWithType = module.Quizzes.map(q => ({ ...q, type: 'quiz' }));

        // 3. 💡 Lấy Material độc lập (đang bị null lesson_id như trong ảnh của bạn)
        const materialsWithType = (module.Material || []).map(m => ({
            id: `mat-${m.id}`,
            title: m.title || 'Tài liệu tham khảo', // Sẽ hiển thị tên file PDF
            file_url: m.file_url,
            type: 'lesson', // Cứ gán là lesson để Frontend xài chung cái icon màu xanh
            order_index: 99 // Cho nó nằm dưới cùng của chương
        }));

        // Gộp cả 3 loại lại thành 1 list
        const combinedItems = [...lessonsWithType, ...quizzesWithType, ...materialsWithType];
        combinedItems.sort((a, b) => a.order_index - b.order_index);

        return {
            id: module.id,
            title: module.title,
            description: module.description,
            order_index: module.order_index,
            items: combinedItems
        };
    });

    formattedModules.sort((a, b) => a.order_index - b.order_index);
    delete data.Module;

    return {
        ...data,
        modules: formattedModules,
        teacher: data.User
    };
}

const getCourseMembers = async (courseId) => {
    // Truy vấn vào bảng Enrollment, lọc theo courseId
    // Đồng thời JOIN sang bảng User để lấy thông tin cá nhân của học viên
    const { data, error } = await supabase
        .from('Enrollment')
        .select(`
            status,
            total_score,
            joined_at,
            last_accessed_at,
            User:user_id (
                id,
                full_name,
                email,
                avatar_url
            )
        `)
        .eq('course_id', courseId)
        .order('joined_at', { ascending: true }); // Sắp xếp theo ngày tham gia

    if (error) {
        console.error('Lỗi khi lấy danh sách thành viên:', error);
        throw new Error('Không thể lấy danh sách học viên');
    }

    // Nhào nặn dữ liệu cho Frontend dễ dùng hơn (làm phẳng object User)
    const formattedMembers = data.map(enrollment => ({
        id: enrollment.User.id,
        full_name: enrollment.User.full_name,
        email: enrollment.User.email,
        avatar_url: enrollment.User.avatar_url,
        status: enrollment.status,
        score: enrollment.total_score,
        last_accessed_at: enrollment.last_accessed_at,
        joined_at: enrollment.joined_at,
        role: 'STUDENT'
    }));

    return formattedMembers;
};

const getCourseAssignments = async (courseId, userId) => {
    const now = new Date();

    const { data: quizzes, error: quizError } = await supabase
        .from('Quizzes')
        .select(`
            id, title, description, duration_minutes, due_date,
            Questions ( points )
        `)
        .eq('course_id', courseId);

    // 🛑 LỖI 1 ĐÃ SỬA: Đổi 'score' thành 'total_score'
    const { data: attempts } = await supabase
        .from('QuizAttempts')
        .select('quiz_id, status, total_score')
        .eq('user_id', userId);

    return quizzes.map(quiz => {
        const totalPoints = quiz.Questions.reduce((sum, q) => sum + (q.points || 0), 0);
        const userAttempt = attempts?.find(a => a.quiz_id === quiz.id);
        const isExpired = quiz.due_date && new Date(quiz.due_date) < now;

        let status = 'Active'; // Mặc định là chưa làm
        let score = null;

        if (userAttempt) {
            // 🛑 LỖI 2 ĐÃ SỬA: Dùng .toUpperCase() để không bao giờ sợ sai hoa/thường
            if (userAttempt.status.toUpperCase() === 'GRADED') {
                status = 'Graded';
                // 🛑 LỖI 3 ĐÃ SỬA: Lấy dữ liệu từ 'total_score'
                score = userAttempt.total_score;
            } else {
                status = 'Submitted';
            }
        } else if (isExpired) {
            status = 'Expired';
        } else {
            status = 'Active';
        }

        return {
            id: quiz.id,
            title: quiz.title,
            due_date: quiz.due_date,
            points: totalPoints,
            status: status,
            score: score
        };
    });
};
module.exports = {
    getAllCourses,
    createCourse,
    getAllCourseByUser,
    getCourseDetailById,
    getCourseMembers,
    updateLastAccess,
    getCourseAssignments
};