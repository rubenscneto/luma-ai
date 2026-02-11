// Training Prompts for Luma AI
import { LUMA_BASE_SYSTEM_PROMPT, buildUserContextBlock } from './baseSystemPrompt';

export const TRAINING_PLAN_SYSTEM_PROMPT = `${LUMA_BASE_SYSTEM_PROMPT}

TAREFA ESPECÍFICA: Gerar plano de treino semanal personalizado.

REGRAS DE TREINO:
1. Respeitar nível do usuário (iniciante: menos volume, mais recuperação)
2. Respeitar equipamentos disponíveis (não sugerir máquinas sem academia)
3. Não ultrapassar o tempo disponível por sessão
4. Alternar grupos musculares adequadamente
5. Incluir aquecimento e alongamento quando apropriado
6. Para hipertrofia: 3-4 séries, 8-12 reps, 60-90s descanso
7. Para definição: 3-4 séries, 12-15 reps, 45-60s descanso
8. Para condicionamento: circuitos, HIIT, menos descanso
9. Para força: 4-5 séries, 3-6 reps, 120-180s descanso

FORMATO DE RESPOSTA (JSON obrigatório):
{
  "weekPlan": [
    {
      "dayOfWeek": "mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun",
      "focus": "Grupo muscular / tipo de treino",
      "workout": [
        {
          "exerciseId": "uuid-like string único",
          "name": "Nome do exercício",
          "machineOrType": "haltere|barra|máquina|peso corporal|elástico|cabo",
          "setsTarget": 3,
          "repsTarget": "8-12",
          "restSecTarget": 60,
          "notes": "Dica curta opcional"
        }
      ]
    }
  ],
  "rationale": "Breve explicação (1-2 frases) do porquê desta divisão",
  "disclaimer": "Sugestões gerais, não substituem orientação profissional."
}

IMPORTANTE:
- Dias sem treino devem ter dayOfWeek mas workout vazio e focus "Descanso"
- Mínimo 1 e máximo 2 dias de descanso por semana
- exerciseId deve ser único e consistente (use formato slug: "supino-reto", "agachamento-livre")
`;

export const PROGRESSION_SYSTEM_PROMPT = `${LUMA_BASE_SYSTEM_PROMPT}

TAREFA ESPECÍFICA: Analisar histórico de treino e sugerir progressão.

REGRAS DE PROGRESSÃO:
1. Só sugerir aumento de carga se:
   a) Usuário bateu reps alvo em TODAS as séries por 2 sessões seguidas
   b) RPE médio <= 8
2. Se RPE > 8 mas reps batidas: manter carga, melhorar técnica
3. Se reps NÃO batidas: manter ou reduzir (deload se 2+ sessões seguidas abaixo)
4. Se não há dados suficientes (< 2 sessões): sugerir manter
5. Calorias estimadas: duração(min) * MET * peso(kg) / 60
   - MET musculação leve: 3.0, moderada: 5.0, intensa: 6.0

FORMATO DE RESPOSTA (JSON obrigatório):
{
  "progressions": [
    {
      "exerciseId": "string",
      "exerciseName": "string",
      "suggestion": "Frase curta da sugestão",
      "type": "increase_weight"|"increase_reps"|"decrease_rest"|"maintain"|"deload",
      "detail": "Detalhe: ex: +2.5kg na próxima sessão"
    }
  ],
  "overallMessage": "Resumo geral do progresso (1-2 frases)",
  "estimatedCalories": number,
  "shouldAskWeight": boolean,
  "disclaimer": "Sugestões gerais, não substituem orientação profissional."
}
`;

export function buildTrainingPlanPrompt(context: {
    goal: string;
    level: string;
    timePerSessionMin: number;
    equipment: string[];
    restrictions?: string[];
    daysPerWeek?: number;
    healthProfile?: any;
}): string {
    const parts = [
        `DADOS PARA O PLANO:`,
        `- Objetivo: ${context.goal}`,
        `- Nível: ${context.level}`,
        `- Tempo por sessão: ${context.timePerSessionMin} min`,
        `- Equipamentos: ${context.equipment.length > 0 ? context.equipment.join(', ') : 'nenhum (peso corporal apenas)'}`,
        `- Dias por semana: ${context.daysPerWeek || 'a definir (sugira o ideal)'}`,
    ];

    if (context.restrictions?.length) {
        parts.push(`- Restrições/Lesões: ${context.restrictions.join(', ')}`);
    }

    if (context.healthProfile) {
        parts.push('', buildUserContextBlock({ userProfile: context.healthProfile }));
    }

    parts.push('', 'Gere o plano semanal completo (7 dias, incluindo descanso) seguindo o schema JSON.');

    return parts.join('\n');
}

export function buildProgressionPrompt(context: {
    exerciseHistory: {
        exerciseId: string;
        exerciseName: string;
        sessions: {
            date: string;
            sets: { weight: number; reps: number; rpe?: number }[];
        }[];
        targetReps: string;
    }[];
    bodyWeightKg?: number;
    sessionDurationMin?: number;
}): string {
    const parts = ['HISTÓRICO DE EXERCÍCIOS (últimas 4 sessões):'];

    for (const ex of context.exerciseHistory) {
        parts.push(`\n${ex.exerciseName} (ID: ${ex.exerciseId}) — Alvo: ${ex.targetReps} reps`);
        for (const session of ex.sessions) {
            const setsStr = session.sets
                .map((s, i) => `  Série ${i + 1}: ${s.weight}kg x ${s.reps} reps${s.rpe ? ` RPE ${s.rpe}` : ''}`)
                .join('\n');
            parts.push(`  Sessão ${session.date}:\n${setsStr}`);
        }
    }

    if (context.bodyWeightKg) {
        parts.push(`\nPeso corporal: ${context.bodyWeightKg}kg`);
    }
    if (context.sessionDurationMin) {
        parts.push(`Duração da sessão: ${context.sessionDurationMin} min`);
    }

    parts.push('\nAnalise e gere as sugestões de progressão seguindo o schema JSON.');

    return parts.join('\n');
}
