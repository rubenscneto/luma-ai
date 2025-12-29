import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// Helper to safely get model or return mock if no key
const getModel = () => {
    if (!apiKey) {
        console.warn("GEMINI_API_KEY is not set. Returning mock data.");
        return null;
    }
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
};

export async function generateMotivation(): Promise<string> {
    const model = getModel();
    if (!model) return "O sucesso é a soma de pequenos esforços repetidos dia após dia.";

    try {
        const result = await model.generateContent("Gere uma frase de motivação curta, inspiradora e direta para alguém focado em produtividade e estudos. Responda apenas com a frase.");
        return result.response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        return "Mantenha o foco, você está construindo seu futuro.";
    }
}

export async function generateRoutine(profile: any): Promise<any> {
    console.log("Generating routine with profile:", JSON.stringify(profile));
    const model = getModel();
    if (!model) {
        console.error("Gemini Model not initialized (Key missing?)");
        throw new Error("API Key missing");
    }

    const prompt = `Crie uma rotina diária detalhada em formato JSON baseado no seguinte perfil:
  ${JSON.stringify(profile)}
  
  Retorne APENAS um array JSON válido de objetos com este formato:
  { "id": "string", "title": "string", "startTime": "HH:mm", "duration": number, "type": "work"|"study"|"leisure"|"health"|"fixed" }
  Certifique-se que o JSON é válido e não contem markdown (backticks).`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const startIndex = responseText.indexOf('[');
        const endIndex = responseText.lastIndexOf(']') + 1;
        if (startIndex === -1 || endIndex === 0) throw new Error("No JSON array found");
        const jsonStr = responseText.substring(startIndex, endIndex);
        return JSON.parse(jsonStr);
    } catch (error) {
        console.warn("Gemini API Error (Falling back to Mock):", error);
        // Robust Mock Generation based on profile
        const isNight = profile.peak === "Noite";
        const baseHour = isNight ? 10 : 7;

        return [
            { id: "1", title: "Acordar e Hidratação", startTime: `${baseHour.toString().padStart(2, '0')}:00`, duration: 30, type: "health" },
            { id: "2", title: "Planejamento do Dia", startTime: `${baseHour}:30`, duration: 15, type: "fixed" },
            { id: "3", title: `Foco: ${profile.occupation} (Sessão 1)`, startTime: `${(baseHour + 1).toString().padStart(2, '0')}:00`, duration: 90, type: "work" },
            { id: "4", title: "Intervalo Revigorante", startTime: `${(baseHour + 2).toString().padStart(2, '0')}:30`, duration: 15, type: "leisure" },
            { id: "5", title: `Foco: ${profile.occupation} (Sessão 2)`, startTime: `${(baseHour + 2).toString().padStart(2, '0')}:45`, duration: 90, type: "work" },
            { id: "6", title: "Almoço Nutritivo", startTime: `${(baseHour + 4).toString().padStart(2, '0')}:30`, duration: 60, type: "health" },
            { id: "7", title: `Estudo: ${profile.fixedTasks}`, startTime: `${(baseHour + 6).toString().padStart(2, '0')}:00`, duration: 60, type: "study" },
            { id: "8", title: "Exercício Físico / Caminhada", startTime: `${(baseHour + 7).toString().padStart(2, '0')}:30`, duration: 45, type: "health" },
            { id: "9", title: "Descompressão e Lazer", startTime: `${(baseHour + 9).toString().padStart(2, '0')}:00`, duration: 60, type: "leisure" }
        ];
    }
}

export async function generateInsight(contextData: string): Promise<string> {
    const model = getModel();
    if (!model) return "Analise seus padrões de energia para otimizar tarefas exigentes.";

    try {
        const result = await model.generateContent(`Com base nestes dados: ${contextData}. Gere um insight curto e acionável em uma frase.`);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        return "Revise suas prioridades para amanhã.";
    }
}

export async function summarizePDF(text: string): Promise<string> {
    const model = getModel();
    if (!model) return "Resumo indisponível sem chave de API.";

    try {
        const result = await model.generateContent(`Resuma o seguinte texto extraído de um PDF, focando nos pontos chave e conclusões: ${text.substring(0, 5000)}`);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        return "Erro ao gerar resumo.";
    }
}
