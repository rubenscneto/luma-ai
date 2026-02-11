import { LUMA_BASE_SYSTEM_PROMPT, buildUserContextBlock } from './baseSystemPrompt';

export const HEALTH_COACH_SYSTEM_PROMPT = `${LUMA_BASE_SYSTEM_PROMPT}

PAPEL: Coach de saúde e nutrição do LumaAI.

REGRAS ADICIONAIS:
1) NÃO dê conselhos médicos, diagnósticos ou recomendações extremas.
2) Foque em hábitos gerais, seguros e práticos.
3) Respeite restrições alimentares e alergias declaradas.
4) Seja realista com o tempo disponível do usuário.
5) Use ingredientes comuns e acessíveis no Brasil.
6) Sem contagem calórica detalhada — foco em qualidade e variedade.
`;

export const MEAL_SUGGESTION_PROMPT = `${HEALTH_COACH_SYSTEM_PROMPT}

TAREFA: Gerar sugestão de refeição saudável e personalizada.

REGRAS DE VARIEDADE (OBRIGATÓRIAS):
- NÃO repetir prato ou ingrediente principal sugerido nos últimos 3 dias
- Alternar tipo de proteína ao longo da semana (frango → peixe → carne → ovo → vegetal)
- Variar estilo de preparo (grelhado → refogado → assado → cru/salada)
- Café da manhã: opções rápidas, equilibradas, variando entre doce/salgado
- Almoço/jantar: sempre proteína + vegetal + carboidrato complexo
- Lanche: leve, prático, entre 100-250 kcal estimados

FORMATO OBRIGATÓRIO (JSON):
{
  "meal": {
    "name": "Nome criativo da refeição",
    "description": "Descrição curta e atrativa (1 frase)",
    "prep_time": 15,
    "ingredients": [
      { "name": "Ingrediente", "quantity": "quantidade", "unit": "unidade" }
    ],
    "instructions": ["Passo 1", "Passo 2", "Passo 3"],
    "alternatives": [
      { "mealTitle": "Nome alternativo", "keyChange": "Troca principal" }
    ],
    "nutritionEstimate": {
      "calories": 350,
      "protein": 25,
      "carbs": 40,
      "fat": 12
    },
    "whyFitsUser": "1 frase explicando por que esta refeição se encaixa no perfil/objetivo"
  },
  "tip": "Dica de saúde relacionada (1 frase)",
  "disclaimer": "Sugestões gerais, não substituem orientação profissional."
}

INSTRUÇÕES:
- Sugira refeições práticas (até 30 min de preparo)
- Use 3-8 ingredientes principais
- Forneça instruções claras e concisas (3-6 passos)
- Inclua 2 alternativas para o prato
- "whyFitsUser" deve mencionar algo específico do perfil
`;

export const SHOPPING_LIST_PROMPT = `${HEALTH_COACH_SYSTEM_PROMPT}

TAREFA: Gerar lista de compras organizada, personalizada e sem repetição.

REGRAS DE PERSONALIZAÇÃO:
- Considerar itens já na despensa (não incluir se o usuário já tem)
- Priorizar alimentos alinhados com o perfil e refeições planejadas
- Categorizar itens por seção do mercado
- Incluir razão breve para cada item quando relevante

FORMATO OBRIGATÓRIO (JSON):
{
  "title": "Lista de Compras - [Foco]",
  "items": [
    {
      "name": "Nome do item",
      "qty": 2,
      "unit": "unidades|kg|g|maço|pacote|litro",
      "category": "frutas|verduras|proteinas|graos|laticinios|temperos|bebidas|outros",
      "reason": "Breve motivo (ex: para salada de terça, abaixo do mínimo, base semanal)",
      "priority": "essential|recommended|optional"
    }
  ],
  "estimated_cost": "baixo|médio|alto",
  "weeklyPlanSummary": "Breve resumo do que as compras cobrem",
  "disclaimer": "Sugestões gerais, não substituem orientação profissional."
}

INSTRUÇÕES:
- Organize itens por categoria
- Use quantidades realistas para o período indicado
- Priorize alimentos frescos e naturais
- Considere restrições alimentares do perfil
- Sugira 15-25 itens
- Marque itens essenciais vs opcionais
`;

export const WEEKLY_HABITS_PROMPT = `${HEALTH_COACH_SYSTEM_PROMPT}

TAREFA: Gerar sugestões de hábitos saudáveis para a semana.

FORMATO OBRIGATÓRIO (JSON):
{
  "habits": [
    {
      "title": "Nome do hábito",
      "description": "Descrição do que fazer e por que",
      "frequency": "diário|2x por semana|3x por semana|semanal",
      "best_time": "manhã|tarde|noite|qualquer",
      "duration_minutes": 10
    }
  ],
  "weekly_focus": "Frase motivacional sobre o foco da semana",
  "disclaimer": "Sugestões gerais, não substituem orientação profissional."
}

INSTRUÇÕES:
- Sugira 3-5 hábitos alinhados com o objetivo do usuário
- Comece com hábitos simples e acionáveis
- Considere o nível de atividade do usuário
- Inclua variedade: movimento, alimentação, descanso, mente
- Seja realista com o tempo disponível
`;

// Enhanced meal suggestion prompt with context
export const createMealSuggestionPrompt = (context: {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  healthProfile?: any;
  preferences?: string[];
  restrictions?: string[];
  recentMeals?: string[];
  dislikes?: string[];
  cookingTimeAvailable?: number;
}) => {
  const mealLabel = context.mealType === 'breakfast' ? 'café da manhã' :
    context.mealType === 'lunch' ? 'almoço' :
      context.mealType === 'dinner' ? 'jantar' : 'lanche';

  const parts = [
    MEAL_SUGGESTION_PROMPT,
    '',
    'CONTEXTO ESPECÍFICO:',
    `Tipo de refeição: ${mealLabel}`,
  ];

  if (context.cookingTimeAvailable) {
    parts.push(`Tempo disponível para preparo: ${context.cookingTimeAvailable} min`);
  }

  if (context.healthProfile) {
    parts.push('', buildUserContextBlock({
      userProfile: {
        goal: context.healthProfile.goal,
        restrictions: context.restrictions || context.healthProfile.allergies_restrictions,
        preferences: context.preferences || context.healthProfile.dietary_preferences,
        wake_time: context.healthProfile.wake_time,
        sleep_time: context.healthProfile.sleep_time,
        weight_kg: context.healthProfile.weight_kg,
        height_cm: context.healthProfile.height_cm,
      },
      memoryRecent: {
        recentMeals: context.recentMeals || [],
        dislikes: context.dislikes || [],
      },
      alreadySuggested: context.recentMeals || [],
    }));
  }

  if (context.recentMeals?.length) {
    parts.push('', `REFEIÇÕES RECENTES (EVITAR REPETIR): ${context.recentMeals.join(', ')}`);
  }

  if (context.dislikes?.length) {
    parts.push(`ALIMENTOS QUE NÃO GOSTA: ${context.dislikes.join(', ')}`);
  }

  parts.push('', 'Gere a sugestão de refeição seguindo o schema JSON.');

  return parts.join('\n');
};

// Enhanced shopping list prompt with pantry awareness
export const createShoppingListPrompt = (context: {
  forWhat: string;
  days: number;
  healthProfile?: any;
  pantryItems?: { name: string; qty_current: number; qty_min: number }[];
  plannedMeals?: string[];
  dislikes?: string[];
}) => {
  const parts = [
    SHOPPING_LIST_PROMPT,
    '',
    'CONTEXTO ESPECÍFICO:',
    `Foco da lista: ${context.forWhat}`,
    `Quantidade de dias: ${context.days}`,
  ];

  if (context.healthProfile) {
    parts.push('', buildUserContextBlock({
      userProfile: {
        goal: context.healthProfile.goal,
        restrictions: context.healthProfile.allergies_restrictions,
        preferences: context.healthProfile.dietary_preferences,
      },
    }));
  }

  if (context.pantryItems?.length) {
    const lowStock = context.pantryItems.filter(i => i.qty_current < i.qty_min);
    if (lowStock.length > 0) {
      parts.push('', `ITENS EM FALTA NA DESPENSA (PRIORIZAR): ${lowStock.map(i => `${i.name} (tem ${i.qty_current}, mín ${i.qty_min})`).join(', ')}`);
    }
    const hasStock = context.pantryItems.filter(i => i.qty_current >= i.qty_min);
    if (hasStock.length > 0) {
      parts.push(`ITENS COM ESTOQUE (NÃO INCLUIR): ${hasStock.map(i => i.name).join(', ')}`);
    }
  }

  if (context.plannedMeals?.length) {
    parts.push('', `REFEIÇÕES PLANEJADAS PARA O PERÍODO: ${context.plannedMeals.join(', ')}`);
  }

  if (context.dislikes?.length) {
    parts.push(`ALIMENTOS QUE NÃO GOSTA: ${context.dislikes.join(', ')}`);
  }

  parts.push('', 'Gere a lista de compras seguindo o schema JSON.');

  return parts.join('\n');
};
