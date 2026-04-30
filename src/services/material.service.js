const supabase = require('../config/supabase');
// Import đúng cú pháp v2
const { PDFParse } = require('pdf-parse');

// 🔥 IMPORT THÊM RAG SERVICE VÀO ĐÂY
// 🔥 IMPORT ĐÚNG SERVICE
const embeddingService = require('./embedding.service');

// 1. LẤY DANH SÁCH TÀI LIỆU
const getMaterials = async (id) => {
    const { data, error } = await supabase
        .from('Material')
        .select('id, title, file_url, is_processed')
        .or(`lesson_id.eq.${id},session_id.eq.${id}`);

    if (error) throw error;
    return data;
};

// 2. UPLOAD VÀ XỬ LÝ TÀI LIỆU
const uploadAndProcess = async (file, lessonId, sessionId, title) => {
    let extractedText = "";

    // 1. Đọc chữ từ file PDF theo CHUẨN V2
    if (file.mimetype === 'application/pdf') {
        try {
            // Ép kiểu Buffer sang Uint8Array
            const uint8ArrayData = new Uint8Array(file.buffer);

            // Khởi tạo parser với cục data đã được ép kiểu
            const parser = new PDFParse(uint8ArrayData);
            const result = await parser.getText();
            extractedText = result.text;

            console.log("✅ Đã bóc chữ PDF thành công rực rỡ! Số ký tự:", extractedText.length);
        } catch (error) {
            try {
                const uint8ArrayData = new Uint8Array(file.buffer);
                const parser = new PDFParse({ data: uint8ArrayData });
                const result = await parser.getText();
                extractedText = result.text;
                console.log("✅ Đã bóc chữ PDF thành công (Object mode)!");
            } catch (err2) {
                console.error("⚠️ Bó tay với thư viện PDF này:", err2.message);
            }
        }
    }

    // 2. Upload lên Supabase Storage
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const fileName = `${Date.now()}_${safeOriginalName}`;

    // 💡 BIẾN ĐỔI PHÉP THUẬT Ở ĐÂY: Chuyển Node Buffer sang chuẩn Web ArrayBuffer để không bị lỗi 400
    const fileArrayBuffer = file.buffer.buffer.slice(
        file.buffer.byteOffset,
        file.buffer.byteOffset + file.buffer.byteLength
    );

    const { error: storageError } = await supabase
        .storage
        .from('materials')
        .upload(fileName, fileArrayBuffer, {
            contentType: file.mimetype,
            upsert: true,
            duplex: 'half' // CHÌA KHÓA CHỐNG LỖI 400 TRÊN NODE.JS
        });

    if (storageError) throw storageError;

    // 3. Lấy link public
    const { data: { publicUrl } } = supabase.storage.from('materials').getPublicUrl(fileName);

    // 4. Lưu vào Database (bảng Material)
    const { data, error: dbError } = await supabase
        .from('Material')
        .insert({
            session_id: sessionId || null,
            lesson_id: lessonId || null,
            title: title || file.originalname,
            file_url: publicUrl,
            extracted_text: extractedText,
            is_processed: true
        })
        .select()
        .single();

    if (dbError) throw dbError;

    // ========================================================
    // 5. 🔥 GỌI RAG SERVICE ĐỂ BĂM NHỎ VÀ LƯU VECTOR (TÍCH HỢP MỚI)
    // ========================================================
    if (data && extractedText && extractedText.length > 0) {
        // Chạy ngầm tiến trình tạo Vector
        embeddingService.createEmbeddingsForMaterial(data.id, extractedText)
            .then(success => {
                if (success) console.log(`🎉 Tiến trình RAG hoàn tất cho file ID: ${data.id}`);
            })
            .catch(err => console.error("❌ Lỗi RAG background:", err));
    }

    // Trả về data cho Controller ngay lập tức để Frontend báo thành công
    return data;
};

// 3. XÓA TÀI LIỆU
const deleteMaterial = async (id) => {
    const { data: material } = await supabase.from('Material').select('file_url').eq('id', id).single();

    if (material && material.file_url) {
        const fileName = material.file_url.split('/').pop();
        await supabase.storage.from('materials').remove([fileName]);
    }

    const { error } = await supabase.from('Material').delete().eq('id', id);
    if (error) throw error;

    return true;
};

module.exports = { getMaterials, uploadAndProcess, deleteMaterial };