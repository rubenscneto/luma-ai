import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// Helper to safely get model or return mock if no key
const getModel = () => {
    if (!apiKey) {
        console.warn("GEMINI_API_KEY is not set. Returning mock data.");
        return null;
    }
    return genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });
};

export async function generateMotivation(): Promise<{ text: string, author: string }> {
    const model = getModel();
    if (!model) return { text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier" };

    try {
        const prompt = `Gere uma frase de motivação curta e inspiradora dita por uma pessoa famosa (empresário, visionário, figura histórica).
        Retorne APENAS um JSON no formato: { "text": "A frase em português", "author": "Nome do Autor" }`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const jsonStr = text.replace(/```json|```/g, "").trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Gemini Error:", error);

        const FALLBACK_QUOTES = [
            { text: "A única maneira de fazer um excelente trabalho é amar o que você faz.", author: "Steve Jobs" },
            { text: "O sucesso não é final, o fracasso não é fatal: é a coragem de continuar que conta.", author: "Winston Churchill" },
            { text: "A lógica pode levar de A a B. A imaginação leva a qualquer lugar.", author: "Albert Einstein" },
            { text: "Se você pode sonhar, você pode fazer.", author: "Walt Disney" },
            { text: "Não espere. O tempo nunca será o ideal.", author: "Napoleon Hill" },
            { text: "A persistência é o caminho do êxito.", author: "Charles Chaplin" }
        ];

        return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
    }
}

export async function generateRoutine(profile: any): Promise<any> {
    console.log("Generating routine with profile:", JSON.stringify(profile));
    const model = getModel();
    if (!model) {
        console.error("Gemini Model not initialized (Key missing?)");
        throw new Error("API Key missing");
    }

    const prompt = `Crie uma rotina diária detalhada em formato JSON baseado no seguinte perfil e restrições:
    PERFIL DO USUÁRIO:
    - Ocupações: ${Array.isArray(profile.occupations) ? profile.occupations.join(', ') : profile.occupation}
    - Descrição da Rotina (Contexto Pessoal): "${profile.description || "Não informada"}"
    - Foco de Estudos: "${profile.studyFocus || "Não informado"}"
    - Pico de Produtividade: ${profile.peakProductivity}
    - Energia: ${profile.energyLevel}
    - Estilo: ${profile.style}
    
    RESTRIÇÕES DE HORÁRIO (RIGOROSO):
    - Acorda: ${profile.userSettings?.wake_up_time || "07:00"}
    - Dorme: ${profile.userSettings?.bed_time || "22:00"}
    - TAREFAS FIXAS: ${JSON.stringify(profile.fixedTasks)}
    
    INSTRUÇÕES:
    1. A rotina DEVE começar no horário de acordar e terminar no horário de dormir.
    2. Respeite OBRIGATORIAMENTE os horários das Tarefas Fixas (Ex: se tem Trabalho das 09h às 18h, não agende estudos nesse período).
    3. Use a "Descrição da Rotina" para entender o contexto do usuário (ex: filhos, home office, etc) e adaptar os blocos.
    4. Se houver "Foco de Estudos", agende blocos específicos para isso.
    5. Agende blocos de foco nos horários de pico de produtividade.
    6. Inclua pausas e refeições.
    7. NÃO gere mais de 15 blocos principais no dia. Agrupe tarefas pequenas.
    8. Mínimo de 15 minutos por bloco (exceto pausas rápidas).

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

        let routine = JSON.parse(jsonStr);

        // --- GUARDRAILS & SANITIZATION ---
        const MAX_BLOCKS = 24;
        const MIN_DURATION = 10; // minutes
        const seenSignatures = new Set<string>();
        const sanitizedRoutine: any[] = [];

        for (const block of routine) {
            // 1. Basic Validation
            if (!block.title || !block.startTime || !block.duration) continue;

            // 2. Min Duration Enforcement (merge or skip if too small, unless fixed)
            if (block.type !== 'fixed' && block.duration < MIN_DURATION) {
                // Try to merge with previous if same type, otherwise skip or bump to min
                const prev = sanitizedRoutine[sanitizedRoutine.length - 1];
                if (prev && prev.type === block.type) {
                    prev.duration += block.duration;
                    continue;
                }
                block.duration = MIN_DURATION; // Bump to min
            }

            // 3. Deduplication
            // Signature: title-type-startTime
            const sig = `${block.title.toLowerCase().trim()}-${block.type}-${block.startTime}`;
            if (seenSignatures.has(sig)) continue;

            seenSignatures.add(sig);
            sanitizedRoutine.push(block);
        }

        // 4. Max Blocks Constraint
        if (sanitizedRoutine.length > MAX_BLOCKS) {
            console.warn(`Routine generated ${sanitizedRoutine.length} blocks, truncating to ${MAX_BLOCKS} and merging tails.`);
            // Keep first 20, merge rest into a "Review & Plan" block or similar? 
            // Better to just truncate for safety than explode DB.
            sanitizedRoutine.length = MAX_BLOCKS;
        }

        return sanitizedRoutine;

    } catch (error) {
        console.warn("Gemini API Error (Falling back to Mock):", error);
        // Robust Mock Generation based on profile
        const wakeTime = profile.userSettings?.wake_up_time || "07:00";
        const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
        const baseHour = wakeHour;

        const mockRoutine = [
            { id: "1", title: "Acordar e Hidratação", startTime: `${baseHour.toString().padStart(2, '0')}:${wakeMin.toString().padStart(2, '0')}`, duration: 30, type: "health" },
            { id: "2", title: "Planejamento do Dia", startTime: `${(baseHour).toString().padStart(2, '0')}:${(wakeMin + 30).toString().padStart(2, '0')}`, duration: 15, type: "fixed" },
            { id: "3", title: `Foco: ${profile.occupations?.[0] || profile.occupation || 'Trabalho'} (Sessão 1)`, startTime: `${(baseHour + 1).toString().padStart(2, '0')}:00`, duration: 90, type: "work" },
            { id: "4", title: "Almoço", startTime: "12:00", duration: 60, type: "health" },
            { id: "5", title: `Foco: ${profile.occupations?.[0] || profile.occupation || 'Trabalho'} (Sessão 2)`, startTime: "14:00", duration: 90, type: "work" },
        ];

        return mockRoutine;
    }
}

export async function generateInsight(contextData: string): Promise<string> {
    const model = getModel();
    if (!model) return "Analise seus padrões de energia para otimizar tarefas exigentes.";

    try {
        const result = await model.generateContent(`Com base nestes dados: ${contextData}. Gere um insight curto e acionável em uma frase. NÃO use aspas, NEM colchetes, NEM markdown. Apenas o texto puro.`);
        let text = result.response.text();

        // Clean up common AI artifacts just in case
        text = text.replace(/^["'\[]+|["'\]]+$/g, '').trim();
        text = text.replace(/\\"/g, '"');

        return text;
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
