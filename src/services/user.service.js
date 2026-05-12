const supabase = require('../config/supabase');

const updateProfileById = async (userId, updateData) => {
    const { data, error } = await supabase
        .from('User')
        .update(updateData)
        .eq('id', userId)
        // Lấy đúng các cột có trong DB của bạn
        .select(`id, email, full_name, role, avatar_url, created_at`)
        .single();

    if (error) {
        console.error('❌ Lỗi từ Supabase khi update profile:', error);
        throw new Error(`Không thể cập nhật hồ sơ: ${error.message}`);
    }

    return data;
};

const getUserProfileById = async (userId) => {
    const { data, error } = await supabase
        .from('User')
        // Chỉ lấy những trường cần thiết hiển thị cho an toàn
        .select(`id, email, full_name, role, avatar_url, created_at`)
        .eq('id', userId)
        .single(); // Lấy 1 object duy nhất thay vì mảng

    if (error) {
        console.error('❌ Lỗi từ Supabase khi get profile:', error);
        throw new Error(`Không thể lấy thông tin hồ sơ: ${error.message}`);
    }

    return data;
};

module.exports = {
    // ... đừng quên export hàm mới này
    getUserProfileById,
    updateProfileById
};