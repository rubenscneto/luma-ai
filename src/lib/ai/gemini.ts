import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export const GEMINI_MODELS = {
    PRO_2_5: "gemini-2.5-pro",
    FLASH_2_5: "gemini-2.5-flash",
    FLASH_3: "gemini-3-flash", // Future/Experimental
} as const;

export function getGeminiModel(config?: { temperature?: number, systemInstruction?: string }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const genAI = new GoogleGenerativeAI(apiKey);

    // Forcing gemini-2.5-pro as specifically requested by the user
    const modelName = GEMINI_MODELS.PRO_2_5;

    console.log("Usando modelo Gemini EXCLUSIVAMENTE:", modelName);

    return genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: config?.systemInstruction,
        generationConfig: {
            responseMimeType: "application/json",
            temperature: config?.temperature ?? 0.1,
            topP: 0.8,
            topK: 32,
            maxOutputTokens: 8192,
        },
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
    });
}
