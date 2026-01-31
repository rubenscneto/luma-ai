import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    // Default to 2.0-flash as decided in previous tasks, fallback to 1.5 if needed by env var
    const modelName = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" }
    });
}
