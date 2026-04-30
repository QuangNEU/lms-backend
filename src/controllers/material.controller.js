const materialService = require('../services/material.service');

const getByLesson = async (req, res) => {
    try {
        const data = await materialService.getMaterials(req.params.lessonId);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const upload = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "Vui lòng chọn file!" });

        // 🚨 THEO DÕI: In ra xem Frontend thực sự gửi lên cái gì
        console.log("📥 Dữ liệu form gửi lên:", req.body);

        let { lessonId, sessionId, title } = req.body;

        // Ép kiểu sang số nguyên
        const cleanSessionId = (sessionId && sessionId !== 'undefined' && sessionId !== 'null') ? parseInt(sessionId, 10) : null;
        const cleanLessonId = (lessonId && lessonId !== 'undefined' && lessonId !== 'null') ? parseInt(lessonId, 10) : null;

        // 🚨 THEO DÕI: Xem ID trước khi chui vào Database
        console.log("👉 ID chuẩn bị lưu:", { cleanLessonId, cleanSessionId });

        const data = await materialService.uploadAndProcess(req.file, cleanLessonId, cleanSessionId, title);

        res.json({ success: true, data });
    } catch (error) {
        console.error("Lỗi Upload API:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const remove = async (req, res) => {
    try {
        await materialService.deleteMaterial(req.params.id);
        res.json({ success: true, message: "Xóa thành công" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getByLesson, upload, remove };