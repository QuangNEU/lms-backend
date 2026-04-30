const aiService = require('../services/ai.service');

const getSessionHistory = async (req, res) => {
    try {
        const data = await aiService.getHistory(req.params.sessionId);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const handleChat = async (req, res) => {
    try {
        const { sessionId, message, materialIds } = req.body;
        const data = await aiService.processChat(sessionId, message, materialIds);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


const getUserSessions = async (req, res) => {
    try {
        // Lấy ID từ req.user (do middleware verifyToken giải mã từ JWT)
        const userId = req.user.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Không tìm thấy thông tin người dùng!" });
        }

        const data = await aiService.getAllSessions(userId);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createNewSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { title } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Vui lòng đăng nhập!" });
        }

        const data = await aiService.createSession(userId, title);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// Nhớ export
module.exports = { getSessionHistory, handleChat, getUserSessions, createNewSession };