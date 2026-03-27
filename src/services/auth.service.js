const supabase = require('../config/supabase')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')

const register = async (email, password, fullName) => {
    // B1: Kiểm tra xem email đã tồn tại chưa
    const { data: existingUser } = await supabase.from('User').select('id').eq('email', email).single();
    if (existingUser) throw new Error('Email này đã được sử dụng!');

    // B2: Mã hóa mật khẩu (băm 10 vòng)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // B3: Lưu vào Database (Mặc định role là STUDENT)
    const { data: newUser, error } = await supabase
        .from('User')
        .insert([{ email, password: hashedPassword, full_name: fullName, role: 'STUDENT' }])
        .select('id, email, full_name, role') // Trả về data mới tạo (nhưng giấu password đi)
        .single();

    if (error) throw new Error(error.message);
    return newUser;
};

const login = async (email, password) => {
    const { data: user, error } = await supabase.from('User').select('*').eq('email', email).single();
    if (error || !user) throw new Error("Email hoac mat khau khong chinh xac");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Email hoặc mật khẩu không chính xác!');

    const payload = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    delete user.password;

    return { user, token };
}

module.exports = { login, register }