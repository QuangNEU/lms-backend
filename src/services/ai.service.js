const supabase = require('../config/supabase');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getRelevantChunks } = require('./rag.service');

// Khởi tạo Gemini với API Key của bạn
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getHistory = async (sessionId) => {
    const { data, error } = await supabase.from('ChatMessage').select('role, content, metadata').eq('session_id', sessionId).order('created_at', { ascending: true });
    if (error) throw error;
    return data;
};

const processChat = async (sessionId, userMessage, materialIds) => {
    // 1. Lấy lịch sử chat
    const { data: history } = await supabase
        .from('ChatMessage')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(5);

    const chronologicalHistory = history ? history.reverse() : [];

    // 2. Lưu user message
    await supabase.from('ChatMessage').insert({
        session_id: sessionId,
        role: 'user',
        content: userMessage
    });

    // 3. CHIẾN LƯỢC LẤY TEXT: Xác định mục đích của người dùng
    let contextText = "";
    const isMindmapRequest = userMessage.toLowerCase().includes("sơ đồ") || userMessage.toLowerCase().includes("tổng quan");

    if (materialIds && materialIds.length > 0) {
        if (isMindmapRequest) {
            // Nếu yêu cầu vẽ sơ đồ/tổng quan -> Bơm TOÀN BỘ tài liệu để nó nhìn được bức tranh lớn
            console.log("👉 Yêu cầu vẽ sơ đồ/tổng quan: Nạp toàn bộ tài liệu.");
            const { data: materials } = await supabase.from('Material').select('extracted_text').in('id', materialIds);
            contextText = materials ? materials.map(m => m.extracted_text).join('\n\n') : "";
        } else {
            // Nếu hỏi chi tiết -> Dùng RAG để tiết kiệm token và tìm kiếm chính xác
            console.log("👉 Yêu cầu hỏi đáp chi tiết: Dùng RAG.");
            try {
                const chunks = await getRelevantChunks(userMessage, materialIds);
                contextText = chunks.map(c => c.content).join('\n\n');
            } catch (err) {
                console.error("Lỗi RAG, fallback sang lấy toàn bộ tài liệu", err);
                const { data: materials } = await supabase.from('Material').select('extracted_text').in('id', materialIds);
                contextText = materials ? materials.map(m => m.extracted_text).join('\n\n') : "";
            }
        }
        console.log("📚 Context length:", contextText.length);
    } else {
        contextText = "Không có tài liệu.";
    }

    // 4. Model: SỬ DỤNG TÊN CHÍNH XÁC
    const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest", // Đã sửa tên model
        generationConfig: { responseMimeType: "application/json" }
    });

    // 5. Prompt
    const prompt = `
Bạn là trợ lý học tập Atheneum. Đọc nội dung tham khảo sau:
"""${contextText}"""

Lịch sử: ${JSON.stringify(chronologicalHistory)}
Học viên: "${userMessage}"

NHIỆM VỤ:
1. Trả lời câu hỏi ngắn gọn, dùng Markdown.
2. NẾU học viên yêu cầu tóm tắt toàn bộ hoặc vẽ sơ đồ, hãy tạo một sơ đồ tư duy (mindmap) CHI TIẾT SÂU SẮC nhất có thể.

YÊU CẦU MINDMAP:
- Phân cấp TỐI THIỂU 4 TẦNG (Gốc -> Cấp 1 -> Cấp 2 -> Cấp 3 chi tiết).
- Tách nhỏ các khái niệm, đưa các định nghĩa, phương thức vào các node con ở cấp sâu nhất.
- Mỗi node ngắn gọn (3–6 từ).

TRẢ VỀ ĐÚNG JSON NÀY:
{
  "answer": "Trả lời markdown ngắn gọn",
  "mindmap": {
    "shouldUpdate": true,
    "nodes": [ { "id": "1", "data": { "label": "Chủ đề chính" } } ],
    "edges": [ { "id": "e1-2", "source": "1", "target": "2" } ]
  }
}
    `;

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }]
        });

        let aiResponse;
        try {
            aiResponse = JSON.parse(result.response.text());
        } catch {
            aiResponse = { answer: result.response.text(), mindmap: null };
        }

        // 6. Lưu AI
        await supabase.from('ChatMessage').insert({
            session_id: sessionId,
            role: 'assistant',
            content: aiResponse.answer || "Đã xử lý xong",
            metadata: aiResponse.mindmap || null
        });

        return { answer: aiResponse.answer, mindmap: aiResponse.mindmap };

    } catch (err) {
        console.log("❌ AI ERROR:", err.message);
        const errorMsg = "Xin lỗi, AI đang bị quá tải hoặc lỗi kết nối. Vui lòng thử lại!";
        await supabase.from('ChatMessage').insert({ session_id: sessionId, role: 'assistant', content: errorMsg });
        return { answer: errorMsg, mindmap: null };
    }
};

const getAllSessions = async (userId) => {
    const { data, error } = await supabase.from('ChatSession').select('id, title, created_at').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

const createSession = async (userId, title) => {
    const { data, error } = await supabase.from('ChatSession').insert({ user_id: userId, title: title || 'Sổ ghi chú chưa đặt tên' }).select().single();
    if (error) throw error;
    return data;
};

module.exports = { getHistory, processChat, getAllSessions, createSession };