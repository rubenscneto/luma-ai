import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export const GEMINI_MODELS = {
    FLASH_2_5: "gemini-2.5-flash",
    PRO_2_5: "gemini-2.5-pro",
    FLASH_3: "gemini-3-flash", // Future/Experimental
} as const;

export type GeminiRoutePolicy = "default" | "agenda_weekly_heavy" | "agenda_fast_ops";

type GeminiModelConfig = {
    temperature?: number;
    systemInstruction?: string;
    routePolicy?: GeminiRoutePolicy;
    modelName?: string;
};

function resolveGeminiModelName(config?: GeminiModelConfig): string {
    if (config?.modelName) return config.modelName;

    const fallbackModel = GEMINI_MODELS.FLASH_2_5;
    const envDefaultModel = process.env.GEMINI_MODEL?.trim() || fallbackModel;
    const routePolicy = config?.routePolicy ?? "default";

    if (routePolicy === "agenda_weekly_heavy") {
        // Premium is optional: only used if explicitly configured.
        return process.env.GEMINI_PREMIUM_MODEL?.trim() || envDefaultModel;
    }

    if (routePolicy === "agenda_fast_ops") {
        return process.env.GEMINI_FAST_MODEL?.trim() || fallbackModel;
    }

    return envDefaultModel;
}

export function getGeminiModel(config?: GeminiModelConfig) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const genAI = new GoogleGenerativeAI(apiKey);

    const modelName = resolveGeminiModelName(config);

    console.log("Usando modelo Gemini:", modelName, "(policy:", config?.routePolicy ?? "default", ")");

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
