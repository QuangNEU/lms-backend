const courseService = require('../services/course.service');

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

module.exports = {
    getCourses
};