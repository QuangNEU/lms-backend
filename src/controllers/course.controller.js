const courseService = require('../services/course.service.js');

const getCourses = async (req, res, next) => {
    try {
        // Nhờ Service đi lấy data
        const courses = await courseService.getAllCourses();

        // Trả về cho Frontend React
        res.status(200).json({
            success: true,
            message: 'Lấy danh sách khóa học thành công',
            data: courses
        });
    } catch (error) {
        // Nếu Service quăng lỗi, đẩy cho Global Error Handler của Express xử lý
        next(error);
    }
};

const getAllCourseByUser = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: "Khong the xac thuc nguoi dung"
            })
        }

        const courses = await courseService.getAllCourseByUser(user_id);

        return res.status(200).json({
            success: true,
            message: "Lay danh sach khoa hoc cua nguoi dung thanh cong",
            data: courses
        })
    }
    catch (error) {
        console.error("Lỗi tại getAllMyCourses:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}


// Thêm hàm tạo khóa học
const createCourse = async (req, res, next) => {
    try {
        // req.user.id có được là nhờ anh bảo vệ verifyToken cung cấp
        const newCourseData = {
            course_code: req.body.course_code,
            course_name: req.body.course_name,
            description: req.body.description,
            teacher_id: req.user.id // Tự động gán người tạo là giảng viên đang đăng nhập
        };

        const newCourse = await courseService.createCourse(newCourseData);
        res.status(201).json({ success: true, message: 'Tạo khóa học thành công', data: newCourse });
    } catch (error) {
        next(error);
    }
}

const getCourseDetailById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID khóa học không hợp lệ'
            });
        }

        const courseData = await courseService.getCourseDetailById(id);

        if (!courseData) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy khóa học'
            }); // Thêm return ở đây để thoát hàm sớm
        }
        if (userId) {
            courseService.updateLastAccess(userId, id);
        }
        else {
            console.log("[Controller] Lỗi: userId bị trống, không thể cập nhật!");
        }
        // --- ĐOẠN CODE BẠN BỊ THIẾU ---
        // Phải trả dữ liệu về cho Frontend nếu lấy thành công
        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết khóa học thành công',
            data: courseData
        });

    } catch (error) {
        // --- ĐOẠN CODE BẠN BỊ THIẾU ---
        // Bắt lỗi và trả về cho Frontend
        console.error('Lỗi tại getCourseDetailById Controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống máy chủ: ' + error.message
        });
    }
};
// controllers/courseController.js

const getMembers = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        }

        const members = await courseService.getCourseMembers(id);

        return res.status(200).json({
            success: true,
            data: members
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getCourseAssignments = async (req, res, next) => {
    try {
        const { id } = req.params; // course_id
        const userId = req.user.id; // Lấy từ token người dùng đang đăng nhập

        const assignments = await courseService.getCourseAssignments(id, userId);

        return res.status(200).json({
            success: true,
            data: assignments
        });
    } catch (error) {
        console.error("Lỗi lấy danh sách bài tập:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getCourses,
    createCourse,
    getAllCourseByUser,
    getCourseDetailById,
    getMembers,
    getCourseAssignments
};