// Base System Prompt — Luma AI
// This is injected into ALL AI calls to enforce personalization,
// anti-repetition, strict JSON, and proactivity rules.

export const LUMA_BASE_SYSTEM_PROMPT = `Você é a IA do Luma. Sua função é gerar planos, refeições, compras, agenda e treinos com base em DADOS do usuário, evitando respostas genéricas e repetição. Você deve ser proativo: observar padrões e fazer perguntas curtas quando faltar informação.

REGRAS GERAIS (OBRIGATÓRIAS):

1) NUNCA gere algo "no vazio". Sempre use:
   - userProfile (objetivo, restrições, preferências, horários fixos, energia)
   - memoryRecent (últimos 7–14 dias)
   - alreadySuggested (anti-repetição)
   - contexto atual (dia da semana, tempo disponível)
   Se algum dado essencial estiver ausente, faça 1 pergunta curta antes de gerar.

2) ANTI-REPETIÇÃO:
   - Não repetir prato ou ingrediente principal em 48h (refeições).
   - Não repetir lista de compras (itens e quantidades) se cardápio/estoque tiver mudado.
   - Se a saída ficar >80% semelhante à anterior, obrigatoriamente regenere com variação e informe "Versão alternativa".

3) VARIEDADE E COERÊNCIA:
   - Diferenciar por "mealType" (café/almoço/lanche/jantar) com regras específicas.
   - Rotacionar proteína/estilo ao longo da semana.
   - Preferir itens alinhados ao gosto e rotina do usuário.

4) NÃO MINTA SOBRE AÇÕES:
   - Você só pode afirmar "adicionei", "salvei" se receber confirmação do sistema.
   - Caso contrário, diga: "Posso adicionar — confirme" ou "Não consegui salvar, tente novamente".

5) SAÍDA SEMPRE EM JSON (SEM TEXTO SOLTO):
   - Toda resposta deve seguir o schema solicitado pela tela/feature.
   - Não inclua markdown, code fences, ou explicações longas.
   - "rationale" e "whyFitsUser" devem ter no máximo 1-2 frases.

6) PROATIVIDADE COM LIMITES:
   - Faça no máximo 1 pergunta por interação.
   - Quando detectar padrões ou lacunas, pergunte de forma objetiva.

7) IDIOMA: Sempre em pt-BR. Tom direto e útil.

8) DISCLAIMER: Todas as sugestões de saúde devem incluir: "Sugestões gerais, não substituem orientação profissional."
`;

// Helper to build a context block from user data
export function buildUserContextBlock(data: {
    userProfile?: {
        goal?: string;
        restrictions?: string[];
        preferences?: string[];
        training_level?: string;
        equipment?: string[];
        wake_time?: string;
        sleep_time?: string;
        weight_kg?: number;
        height_cm?: number;
        peak_productivity?: string;
        energy_level?: string;
        objectives?: string[];
    };
    memoryRecent?: {
        recentMeals?: string[];
        recentAgendaBlocks?: string[];
        recentWorkouts?: string[];
        dislikes?: string[];
        favorites?: string[];
    };
    alreadySuggested?: string[];
    dayContext?: {
        dayOfWeek?: string;
        timeAvailableMin?: number;
        currentEnergy?: string;
    };
}): string {
    const parts: string[] = [];

    if (data.userProfile) {
        const p = data.userProfile;
        parts.push(`PERFIL DO USUÁRIO:
- Objetivo: ${p.goal || 'não definido'}
- Restrições: ${p.restrictions?.join(', ') || 'nenhuma'}
- Preferências: ${p.preferences?.join(', ') || 'nenhuma'}
- Nível: ${p.training_level || 'iniciante'}
- Equipamentos: ${p.equipment?.join(', ') || 'nenhum'}
- Acordar: ${p.wake_time || '07:00'}
- Dormir: ${p.sleep_time || '22:00'}
${p.weight_kg ? `- Peso: ${p.weight_kg}kg` : ''}
${p.height_cm ? `- Altura: ${p.height_cm}cm` : ''}
${p.peak_productivity ? `- Pico de Produtividade: ${p.peak_productivity}` : ''}
${p.energy_level ? `- Nível de Energia Habitual: ${p.energy_level}` : ''}
${p.objectives?.length ? `- Objetivos: ${p.objectives.join(', ')}` : ''}`);
    }

    if (data.memoryRecent) {
        const m = data.memoryRecent;
        if (m.recentMeals?.length) {
            parts.push(`REFEIÇÕES RECENTES (últimos 7 dias): ${m.recentMeals.join(', ')}`);
        }
        if (m.recentWorkouts?.length) {
            parts.push(`TREINOS RECENTES: ${m.recentWorkouts.join(', ')}`);
        }
        if (m.dislikes?.length) {
            parts.push(`NÃO GOSTA: ${m.dislikes.join(', ')}`);
        }
        if (m.favorites?.length) {
            parts.push(`FAVORITOS: ${m.favorites.join(', ')}`);
        }
    }

    if (data.alreadySuggested?.length) {
        parts.push(`JÁ SUGERIDO (evitar repetir): ${data.alreadySuggested.join(', ')}`);
    }

    if (data.dayContext) {
        const d = data.dayContext;
        parts.push(`CONTEXTO DO DIA:
- Dia da semana: ${d.dayOfWeek || 'não definido'}
- Tempo disponível: ${d.timeAvailableMin ? `${d.timeAvailableMin} min` : 'não informado'}
- Energia atual: ${d.currentEnergy || 'não informado'}`);
    }

    return parts.join('\n\n');
}

// Error/empty fallback JSON templates
export const AI_ERROR_RESPONSE = {
    status: 'error' as const,
    errorMessage: 'Não foi possível gerar a sugestão no momento.',
    retryHint: 'Tente novamente em alguns segundos.',
};

export const AI_EMPTY_RESPONSE = {
    status: 'empty' as const,
    message: 'Nenhuma sugestão disponível com os dados atuais.',
    nextAction: 'Complete seu perfil para receber sugestões personalizadas.',
};
