const authService = require("../services/auth.service.js")

const register = async (req, res, next) => {
    try {
        const { email, password, full_name } = req.body;

        // Gọi Service đăng ký
        const user = await authService.register(email, password, full_name);

        res.status(201).json({
            success: true,
            message: 'Đăng ký tài khoản thành công',
            data: user
        });
    } catch (error) {
        next(error); // Báo lỗi nếu email trùng
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const result = await authService.login(email, password);
        res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công',
            data: result
        });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
}

module.exports = { login, register }