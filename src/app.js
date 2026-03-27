const express = require('express');
const cors = require('cors');
require('dotenv').config();

const courseRoutes = require('./routes/course.route');
const authRoutes = require("./routes/auth.route")
const app = express();

// Middleware: Cấp phép cho Frontend gọi API và cấu hình đọc dữ liệu JSON
app.use(cors());
app.use(express.json());

app.use('/courses', courseRoutes);
app.use('auth', authRoutes);

// Lắng nghe cổng mạng
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server Backend đang chạy tại http://localhost:${PORT}`);
});