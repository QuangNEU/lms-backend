const { GoogleGenerativeAI } = require("@google/generative-ai");
const supabase = require('../config/supabase');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getRelevantChunks = async (query, materialIds) => {
    try {
        // 1. Tạo embedding cho câu hỏi
        const model = genAI.getGenerativeModel({
            model: "gemini-embedding-001"
        });

        const result = await model.embedContent({
            content: {
                parts: [{ text: query }]
            }
        });

        const queryEmbedding = result.embedding.values;

        // 2. Query DB bằng vector
        const { data, error } = await supabase.rpc('match_documents', {
            query_embedding: queryEmbedding,
            match_count: 5, // lấy 5 đoạn gần nhất
            material_ids: materialIds
        });

        if (error) throw error;

        console.log("🔥 Tìm được", data.length, "chunks");

        return data;

    } catch (err) {
        console.error("❌ Lỗi RAG:", err.message);
        return [];
    }
};

module.exports = { getRelevantChunks };