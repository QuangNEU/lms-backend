const { GoogleGenerativeAI } = require("@google/generative-ai");
const supabase = require('../config/supabase');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Chunk thông minh hơn (cắt theo câu)
const chunkText = (text, maxLength = 1000, overlap = 200) => {
    const chunks = [];
    let i = 0;

    while (i < text.length) {
        let chunk = text.slice(i, i + maxLength);

        // Cố gắng cắt tại dấu chấm để giữ ngữ nghĩa
        const lastDot = chunk.lastIndexOf(".");
        if (lastDot > 200) {
            chunk = chunk.slice(0, lastDot + 1);
        }

        chunks.push(chunk);
        i += (maxLength - overlap);
    }

    return chunks;
};

// ✅ Hàm tạo embedding + batch insert (tối ưu)
const createEmbeddingsForMaterial = async (materialId, fullText) => {
    try {
        if (!fullText || fullText.trim().length === 0) {
            throw new Error("Text rỗng");
        }

        console.log(`🤖 RAG cho Material ID: ${materialId}`);

        // 1. Chunk text
        const chunks = chunkText(fullText);
        console.log("📦 Số chunk:", chunks.length);

        const model = genAI.getGenerativeModel({
            model: "gemini-embedding-001"
        });

        const rows = [];

        // 2. Tạo embedding cho từng chunk
        for (const content of chunks) {
            const result = await model.embedContent({
                content: {
                    parts: [{ text: content }]
                }
            });

            rows.push({
                material_id: materialId,
                content: content,
                embedding: result.embedding.values
            });
        }

        // 3. Insert 1 lần (tối ưu hiệu năng)
        const { error } = await supabase
            .from('DocumentChunk')
            .insert(rows);

        if (error) throw error;

        console.log(`✅ OK: ${chunks.length} chunks`);
        return true;

    } catch (error) {
        console.error("❌ Lỗi Embedding:", error.message);
        return false;
    }
};

module.exports = { createEmbeddingsForMaterial };