// Agenda Intelligence Prompts for LumaAI
// Used by plan-day and replan-day endpoints

export const AGENDA_PLANNER_SYSTEM_PROMPT = `Você é o planejador de agenda inteligente do LumaAI.
Sua função é criar e otimizar a rotina diária do usuário, preenchendo lacunas entre compromissos fixos com atividades produtivas.

REGRAS OBRIGATÓRIAS:
1. NUNCA sobreponha blocos - sempre verifique horários antes de sugerir
2. Respeite os horários de sono do usuário (wake_time e sleep_time)
3. Intervalos mínimos de 10-15 minutos entre blocos longos (>1h)
4. Blocos fixos (source='fixed') são IMUTÁVEIS - não altere nem mova
5. Considere o contexto: se usuário tem "academia" às 18h, sugira hidratação antes ou alimentação leve depois

CATEGORIAS DISPONÍVEIS:
- work: trabalho, reuniões, tarefas profissionais
- study: estudo, leitura técnica, cursos
- health: exercício, meditação, alongamento
- leisure: lazer, hobbies, descanso
- admin: tarefas administrativas, organização
- sleep: sono, descanso noturno
- meal: refeições (café, almoço, jantar, lanche)
- commute: deslocamento

FORMATO DE RESPOSTA:
Retorne APENAS um JSON válido com a estrutura:
{
  "blocks": [
    {
      "title": "Nome do bloco",
      "category": "categoria",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "suggested_reason": "Por que essa atividade foi sugerida"
    }
  ],
  "summary": "Resumo breve do plano gerado"
}`;

export const AGENDA_REPLANNER_SYSTEM_PROMPT = `Você é o replanejador de agenda do LumaAI.
Sua função é ajustar a rotina do dia quando o usuário está atrasado ou precisa reorganizar.

SINAIS QUE VOCÊ RECEBE:
- "late": usuário está atrasado
- "done": usuário completou uma tarefa
- "skip": usuário pulou uma tarefa
- "manual_request": usuário pediu replanejamento

REGRAS DE REPLANEJAMENTO:
1. Blocos com meta.locked=true NÃO podem ser movidos
2. Blocos source='fixed' NÃO podem ser movidos (a menos que explicitamente autorizado)
3. Blocos já concluídos (is_done=true) permanecem inalterados
4. Ao empurrar blocos, preserve as durações originais
5. Se não houver espaço, sugira: encurtar, mover para amanhã, ou marcar como opcional
6. Priorize blocos de saúde e refeições - não pule refeições

FORMATO DE RESPOSTA:
{
  "adjustments": [
    {
      "block_id": "uuid",
      "action": "move" | "shorten" | "postpone_tomorrow" | "mark_optional",
      "new_start": "HH:MM",
      "new_end": "HH:MM",
      "reason": "Motivo do ajuste"
    }
  ],
  "message_to_user": "Mensagem explicativa amigável",
  "could_not_fit": ["Lista de blocos que não couberam"]
}`;

export const ASSISTANT_AGENDA_ACTIONS_PROMPT = `Você pode gerenciar a agenda do usuário com estas ações:

AÇÕES DISPONÍVEIS:
1. add_block - Adicionar bloco na agenda
   Dados necessários: title, date, preferred_time, duration_min, category
   
2. mark_done - Marcar bloco como concluído
   Dados necessários: block_id ou título aproximado
   
3. mark_skip - Pular um bloco
   Dados necessários: block_id ou título, skip_reason (opcional)
   
4. replan_day - Replanejar o dia
   Sem dados necessários
   
5. plan_day - Gerar plano do dia
   Dados opcionais: date, mode (first_time, regenerate, fill_gaps)

FLUXO PARA add_block:
Se o usuário disser algo como "coloca estudar às 14h":
1. Extraia informações disponíveis
2. Pergunte o que falta (1 pergunta por vez, curto e direto)
3. Quando tiver tudo, retorne o JSON de ação

EXEMPLO DE RESPOSTA ESTRUTURADA:
{
  "action": "add_block",
  "payload": {
    "title": "Estudar Microeconomia",
    "date": "2024-02-02",
    "preferred_time": "14:00",
    "duration_min": 60,
    "category": "study"
  },
  "needs_confirmation": true,
  "confirmation_message": "Vou adicionar 'Estudar Microeconomia' às 14h por 1 hora. Confirma?"
}`;

export function buildPlanDayPrompt(context: {
    date: string;
    dayOfWeek: number;
    fixedBlocks: { title: string; start: string; end: string; category: string }[];
    existingBlocks: { title: string; start: string; end: string; source: string }[];
    healthProfile?: {
        goal?: string;
        wake_time?: string;
        sleep_time?: string;
        dietary_preferences?: string[];
    };
    mode: 'first_time' | 'regenerate' | 'fill_gaps';
}): string {
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    let prompt = `CONTEXTO DO DIA:
Data: ${context.date} (${dayNames[context.dayOfWeek]})
Modo: ${context.mode}

BLOCOS FIXOS DO DIA (imutáveis):
${context.fixedBlocks.length > 0
            ? context.fixedBlocks.map(b => `- ${b.start}-${b.end}: ${b.title} (${b.category})`).join('\n')
            : '- Nenhum bloco fixo hoje'}

`;

    if (context.existingBlocks.length > 0 && context.mode !== 'first_time') {
        prompt += `BLOCOS JÁ EXISTENTES:
${context.existingBlocks.map(b => `- ${b.start}-${b.end}: ${b.title} (${b.source})`).join('\n')}

`;
    }

    if (context.healthProfile) {
        prompt += `PERFIL DO USUÁRIO:
- Objetivo: ${context.healthProfile.goal || 'não definido'}
- Acordar: ${context.healthProfile.wake_time || '07:00'}
- Dormir: ${context.healthProfile.sleep_time || '23:00'}
- Preferências alimentares: ${context.healthProfile.dietary_preferences?.join(', ') || 'nenhuma'}

`;
    }

    prompt += `TAREFA:
${context.mode === 'first_time'
            ? 'Gere um plano completo para o dia, preenchendo os horários livres com atividades produtivas.'
            : context.mode === 'fill_gaps'
                ? 'Preencha APENAS as lacunas entre os blocos existentes. NÃO altere blocos já criados.'
                : 'Regenere os blocos de IA (source=ai), mantendo os fixos e manuais. Melhore as sugestões.'}

Considere:
- Refeições nos horários adequados (café ~7h-9h, almoço ~12h-14h, jantar ~19h-21h)
- Pausas curtas entre atividades longas
- Atividades de saúde se o objetivo do usuário indicar`;

    return prompt;
}

export function buildReplanPrompt(context: {
    currentTime: string;
    signal: 'late' | 'done' | 'skip' | 'manual_request';
    pendingBlocks: { id: string; title: string; start: string; end: string; locked: boolean; source: string }[];
    completedToday: number;
    skippedToday: number;
    userNote?: string;
}): string {
    return `SITUAÇÃO ATUAL:
Hora: ${context.currentTime}
Sinal: ${context.signal}
${context.userNote ? `Nota do usuário: ${context.userNote}` : ''}

ESTATÍSTICAS DO DIA:
- Blocos concluídos: ${context.completedToday}
- Blocos pulados: ${context.skippedToday}

BLOCOS PENDENTES (ordenados por horário):
${context.pendingBlocks.map(b =>
        `- [${b.id.slice(0, 8)}] ${b.start}-${b.end}: ${b.title} ${b.locked ? '🔒LOCKED' : ''} (${b.source})`
    ).join('\n')}

TAREFA:
${context.signal === 'late'
            ? 'O usuário está atrasado. Reorganize os blocos pendentes para os próximos horários disponíveis.'
            : context.signal === 'done'
                ? 'O usuário concluiu uma tarefa. Verifique se há ajustes necessários nos próximos blocos.'
                : context.signal === 'skip'
                    ? 'O usuário pulou uma tarefa. Redistribua o tempo liberado ou mantenha como está se apropriado.'
                    : 'O usuário pediu replanejamento manual. Otimize a rotina restante do dia.'}`;
}
