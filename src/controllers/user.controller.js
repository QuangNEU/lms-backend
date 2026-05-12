const userService = require('../services/user.service');

const updateProfile = async (req, res) => {
    try {
        // Lấy ID user từ token (đã được middleware auth xử lý)
        const userId = req.user.id;

        // Chỉ lấy 3 trường cần thiết từ Frontend gửi lên
        const { firstName, lastName, avatar_url } = req.body;

        // Xử lý gộp tên (Ví dụ: "Jonathan" + "Vance" => "Jonathan Vance")
        let full_name = undefined;
        if (firstName || lastName) {
            full_name = `${firstName || ''} ${lastName || ''}`.trim();
        }

        const updateData = {};
        if (full_name) updateData.full_name = full_name;
        if (avatar_url) updateData.avatar_url = avatar_url;

        // Nếu FE gọi API mà không truyền gì thì báo lỗi
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có dữ liệu hợp lệ để cập nhật'
            });
        }

        // Thực hiện update
        const updatedUser = await userService.updateProfileById(userId, updateData);

        res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin cá nhân thành công!',
            data: updatedUser
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getProfile = async (req, res) => {
    try {
        // Lấy ID user từ token (đã được middleware auth nhét vào req)
        const userId = req.user.id;

        const userProfile = await userService.getUserProfileById(userId);

        if (!userProfile) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin người dùng!'
            });
        }

        // Trả data về cho Frontend
        res.status(200).json({
            success: true,
            message: 'Lấy thông tin hồ sơ thành công',
            data: userProfile
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    // ... đừng quên export hàm mới
    getProfile,
    updateProfile
};