import { GoogleGenerativeAI } from "@google/generative-ai";

export const GEMINI_MODELS = {
    FLASH_2_5: "gemini-2.5-flash",
    FLASH_3: "gemini-3-flash", // Future/Experimental
} as const;

export function getGeminiModel(config?: { temperature?: number }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    // Default to 2.5-flash. Support experimental 3-flash via env var or feature flag logic
    const useG3 = process.env.FEATURE_FLAG_G3 === 'true';
    const modelName = process.env.GEMINI_MODEL ?? (useG3 ? GEMINI_MODELS.FLASH_3 : GEMINI_MODELS.FLASH_2_5);

    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            responseMimeType: "application/json",
            temperature: config?.temperature ?? 0.7
        }
    });
}
