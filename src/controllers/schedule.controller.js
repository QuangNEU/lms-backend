const scheduleService = require('../services/schedule.service');

const getSchedule = async (req, res) => {
    try {
        const userId = req.user.id; // Lấy từ token qua middleware Auth
        const scheduleData = await scheduleService.getStudentQuizzesSchedule(userId);

        res.status(200).json({
            success: true,
            data: scheduleData
        });
    } catch (error) {
        console.error("❌ LỖI API GET SCHEDULE:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getSchedule };