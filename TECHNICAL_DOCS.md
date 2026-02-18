# LumaAI — Documentação Técnica & Diário de Bordo 🛠️

**Versão Atual**: 2.0.0
**Última Atualização**: 2026-02-18
**Data de Início**: Dezembro 2025

Este documento é a **referência técnica definitiva** do LumaAI. Deve ser atualizado a cada implementação, remoção ou refatoração.

---

## 1. Arquitetura do Sistema

### Stack Tecnológico

| Camada | Tecnologia |
|---|---|
| **Frontend** | Next.js 14+ (App Router) + TypeScript (Strict) |
| **Estilização** | TailwindCSS + Framer Motion |
| **Backend/DB** | Supabase (PostgreSQL + Auth + RLS) |
| **IA** | Google Gemini API (`gemini-2.0-flash`) |
| **Deploy** | Vercel |
| **PWA** | `@ducanh2912/next-pwa` |

### Estrutura de Diretórios

```
src/
├── app/
│   ├── (public)/        # Landing, Login, Register
│   ├── (app)/           # Rotas protegidas (Dashboard, Agenda, etc.)
│   └── api/
│       └── ai/
│           └── agenda/
│               ├── plan-week/route.ts    # Geração semanal
│               ├── plan-day/route.ts     # Geração diária
│               ├── replan-day/route.ts   # Replanejamento
│               └── detect-recurrence/route.ts
├── ai/
│   └── prompts/
│       ├── baseSystemPrompt.ts   # Prompt base (anti-repetição, JSON strict)
│       └── agendaPrompts.ts      # Prompts de agenda (planner, replanner, A/B)
├── components/
│   └── agenda/
│       └── WeekView.tsx          # Visualização semanal
├── context/
│   ├── authContext.tsx            # Sessão do usuário
│   └── dailyPlanContext.tsx       # Estado da agenda (fonte central)
├── lib/
│   ├── timelineSolver.ts         # Motor de resolução de conflitos
│   ├── derivedBlocks.ts          # Blocos derivados (pausas pós-refeição)
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── middleware.ts
└── services/
    └── geminiService.ts
```

---

## 2. Banco de Dados (Supabase PostgreSQL)

### 2.1 Tabela `daily_plan` (Metadado do dia)

| Coluna | Tipo | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `user_id` | uuid | NO | — | FK → auth.users |
| `plan_date` | date | NO | — | Data do plano (YYYY-MM-DD) |
| `timezone` | text | NO | — | Ex: `America/Sao_Paulo` |
| `status` | enum | NO | — | `active` / `completed` |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**Constraints:**
- `UNIQUE (user_id, plan_date)` — impede duplicatas por dia (via `daily_plan_user_id_plan_date_key`)
- Índice: `idx_daily_plan_user_date` em `(user_id, plan_date)`

### 2.2 Tabela `daily_blocks` (Blocos da agenda — FONTE PRINCIPAL)

| Coluna | Tipo | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `plan_id` | uuid | NO | — | FK → daily_plan.id |
| `user_id` | uuid | NO | — | FK → auth.users |
| `title` | text | NO | — | Nome do bloco |
| `category` | enum | NO | — | `work\|study\|health\|leisure\|admin\|sleep\|meal\|commute\|fixed` |
| `start_datetime` | timestamptz | NO | — | Início |
| `end_datetime` | timestamptz | NO | — | Fim |
| `source` | enum | NO | `'manual'` | `manual\|ai\|fixed` |
| `is_done` | boolean | NO | `false` | Concluído |
| `done_at` | timestamptz | YES | — | Quando concluiu |
| `is_skipped` | boolean | NO | `false` | Pulado |
| `skip_reason` | text | YES | — | Motivo do skip |
| `order_index` | integer | NO | `0` | Ordenação |
| `meta` | jsonb | YES | `'{}'` | Metadados extras |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**Constraints:**
- PK `(id)` apenas — **⚠️ NÃO existe UNIQUE em `(plan_id, title, start_datetime)`**

### 2.3 Tabela `fixed_blocks` (Compromissos fixos recorrentes)

| Coluna | Tipo | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `user_id` | uuid | NO | — | FK |
| `title` | text | NO | — | Ex: `Trabalho (Jovem Aprendiz)` |
| `category` | enum | NO | `'fixed'` | Sempre `fixed` |
| `day_of_week` | integer | NO | — | 0=Dom, 1=Seg, ..., 6=Sáb |
| `start_time` | time | NO | — | Ex: `07:00:00` |
| `end_time` | time | NO | — | Ex: `11:30:00` |
| `location` | text | YES | — | |
| `notes` | text | YES | — | |
| `is_active` | boolean | NO | `true` | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**Índices:** `idx_fixed_blocks_user_id`, `idx_fixed_blocks_day (user_id, day_of_week)`

### 2.4 Outras Tabelas

| Tabela | Propósito |
|---|---|
| `profiles` | Nome, ocupação, avatar (synced from Auth) |
| `health_profile` | Meta de saúde, treino, sono, dieta |
| `routine_profile` | Descrição da rotina, hobbies, objetivos (**⚠️ NÃO lido pelo planner**) |
| `subjects` | Matérias de estudo |
| `study_materials` | Links e textos de estudo |
| `flashcards` | Flashcards com SRS (Spaced Repetition) |
| `workout_sessions` | Sessões de treino |

### 2.5 Segurança

- **RLS (Row Level Security)**: Habilitado em todas as tabelas. Filtro: `auth.uid() = user_id`.

---

## 3. Pipeline de Geração de Rotina (IA)

### 3.1 Fluxo `plan-week`

```
Usuário clica "Planejar Semana"
    ↓
WeekView.tsx → POST /api/ai/agenda/plan-week
    ↓
Carrega: profiles, health_profile, fixed_blocks, existing daily_blocks
    ↓
Monta prompt (weekPrompt) com fixos, perfil, contexto
    ↓
Gemini 2.0 Flash gera JSON (aiWeekResponseSchema)
    ↓
Validação Zod (aiWeekResponseSchema)
    ↓
Para cada dia:
  1. UPSERT daily_plan (onConflict: user_id, plan_date)
  2. DELETE daily_blocks existentes (exceto category='fixed')
  3. Filtro: rejeita blocos IA que colidem com fixos
  4. Filtro: rejeita duplicatas semânticas (título igual ou meal <60min)
  5. Converte para SolverBlock
  6. Adiciona blocos derivados (pausas pós-refeição)
  7. Roda timelineSolver.solveTimeline()
  8. Aplica MAX_BLOCKS_PER_DAY=18
  9. INSERT daily_blocks
    ↓
Response: { status, weekSummary, totalBlocks, warnings }
    ↓
WeekView chama fetchWeekBlocks() para refrescar
```

### 3.2 Fluxo `replan-day`

```
Sinal: late | done | skip | manual_request
    ↓
POST /api/ai/agenda/replan-day
    ↓
Se done/skip: atualiza bloco específico no DB
    ↓
Carrega blocos pendentes (não concluídos, não pulados, >= now - 30min)
    ↓
Se late/manual_request: pede à IA ajustes (move, shorten, postpone, mark_optional)
    ↓
Aplica ajustes no DB
    ↓
Reordena blocos (order_index)
    ↓
Response: { success, message, blocks, stats }
```

### 3.3 Timeline Solver (`timelineSolver.ts`)

Motor de resolução de conflitos com **zero-overlap garantido**.

**Algoritmo:**
1. Normaliza blocos (grid de 5min, valida `start < end`)
2. Ordena por prioridade DESC, depois startMin ASC
3. Coloca blocos um a um: se conflito → busca slot livre mais próximo
4. Se não cabe: tenta encurtar (se `canShorten`)
5. Se não cabe de jeito nenhum: sugere outro dia
6. Verificação final: asserta 0 overlaps

**Prioridades:**

| Categoria | Prioridade |
|---|---|
| sleep / fixed | 100 |
| manual (qualquer) | ≥80 |
| meal | 70 |
| health | 65 |
| work / study | 60 |
| commute | 55 |
| admin | 50 |
| leisure / derivado | 40 |

### 3.4 Blocos Derivados (`derivedBlocks.ts`)

Gera automaticamente "Pausa pós-refeição" (30min) ancorada a blocos meal.
- Prioridade: 40 (solver pode mover/encurtar)
- Remove órfãos (se a refeição pai foi removida)

---

## 4. Estado do Frontend (Context API)

### `dailyPlanContext.tsx` — Cérebro da agenda

**State:**
- `todayPlan` — metadado do plano do dia
- `todayBlocks` — blocos do dia (enriched com status)
- `fixedBlocks` — blocos fixos do dia da semana
- `weekBlocks` — `Record<dateStr, DailyBlock[]>` para week view
- `abPlans` — planos A/B para comparação

**Ações principais:**

| Ação | O que faz |
|---|---|
| `loadPlanForDate()` | Busca plan + blocks do DB. Roda solver (só log). Mescla fixos inline |
| `fetchWeekBlocks()` | Busca plans + blocks da semana. Fixos como fallback (dias sem plano) |
| `generatePlan()` | POST `/api/ai/agenda/plan-day` + refetch |
| `markBlockDone()` | UPDATE `daily_blocks.is_done=true` + optimistic update |
| `skipBlock()` | UPDATE `daily_blocks.is_skipped=true` + triggerReplan('skip') |
| `replanDay()` | POST `/api/ai/agenda/replan-day` (signal: manual_request) |
| `addBlock()` | Roda solver local + INSERT + update blocos movidos |

---

## 5. Schemas JSON (Contratos com a IA)

### `aiWeekResponseSchema` (plan-week)
```json
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "blocks": [
        {
          "title": "string",
          "category": "work|study|health|leisure|admin|sleep|meal|commute|fixed",
          "start_time": "HH:MM",
          "end_time": "HH:MM",
          "suggested_reason": "string?",
          "energyLevel": "low|medium|high?"
        }
      ],
      "summary": "string"
    }
  ],
  "weekSummary": "string",
  "weekInsight": "string?"
}
```

### `aiReplanResponseSchema` (replan-day)
```json
{
  "adjustments": [
    {
      "block_id": "string",
      "action": "move|shorten|postpone_tomorrow|mark_optional",
      "new_start": "HH:MM?",
      "new_end": "HH:MM?",
      "reason": "string"
    }
  ],
  "message_to_user": "string",
  "could_not_fit": ["string"]?
}
```

### Error/Empty Fallback
```json
{ "status": "error", "errorMessage": "...", "retryHint": "..." }
{ "status": "empty", "message": "...", "nextAction": "..." }
```

---

## 6. Problemas Conhecidos & Limitações (2026-02-18)

> Documentados no diagnóstico completo. Servem como backlog de correções.

| # | Problema | Causa-raiz | Arquivo |
|---|---|---|---|
| 1 | **Fixos não aparecem na Week View** para dias planejados | `fetchWeekBlocks` só mostra fixos como fallback (dias sem plano) | `dailyPlanContext.tsx:269-271` |
| 2 | **Concluir/Pular "volta"** | `skipBlock` chama `triggerReplan` → `loadTodayPlan` refaz tudo, desfazendo optimistic update | `dailyPlanContext.tsx:388-390` |
| 3 | **Replanejar não roda solver** | `replan-day` pede à IA ajustes textuais, sem solver | `replan-day/route.ts` |
| 4 | **Jantar 16h** (horários sem sentido) | Sem meal windows no backend; prompt é sugestão, não enforcement | `agendaPrompts.ts:186` |
| 5 | **Sem UNIQUE em `daily_blocks`** | Race conditions podem criar duplicatas | Schema DB |
| 6 | **Rotina genérica** | `routine_profile` não é lido pelo planner | `plan-week/route.ts:83-95` |
| 7 | **Auto-heal só loga** | Solver roda on-load mas resultado não é salvo | `dailyPlanContext.tsx:173-181` |
| 8 | **Sem sinônimos na dedup** | "jantar" vs "dinner" vs "refeição" não detectado | `plan-week/route.ts:263-270` |

---

## 7. Prompts de IA

### Base System Prompt (`baseSystemPrompt.ts`)
- Anti-repetição (48h para refeições)
- Saída JSON strict (sem markdown, sem text solto)
- Proatividade limitada (max 1 pergunta)
- Idioma: sempre pt-BR
- Disclaimer de saúde obrigatório

### Agenda Planner Prompt (`agendaPrompts.ts`)
- Regra de duplicidade semântica
- Limite de 15-18 blocos
- Blocos fixos são imutáveis
- Categorias: work, study, health, leisure, admin, sleep, meal, commute
- Energy level por bloco

### Agenda Replanner Prompt
- Sinais: late, done, skip, manual_request
- Blocos locked não movem
- Prioriza saúde e refeições

---

## 📅 Diário de Bordo (Changelog)

### [18/02/2026] - Diagnóstico Completo & Documentação
- **Diagnóstico**: Auditoria completa da pipeline de geração de rotina
- **Identificados**: 8 problemas críticos (fixos na week view, skip volta, replan sem solver, jantar 16h, sem UNIQUE em blocks, routine_profile ignorado, auto-heal só loga, sem sinônimos)
- **DB Fix**: Adicionada constraint `UNIQUE(user_id, plan_date)` em `daily_plan`
- **DB Fix**: Limpeza de registros duplicados em `daily_plan`
- **API Fix**: UPSERT em `plan-week` (onConflict: user_id, plan_date)
- **API Fix**: Filtro de colisão IA vs Fixos + dedup semântica
- **API Fix**: MAX_BLOCKS_PER_DAY=18 (guardrail)
- **Documentação**: `TECHNICAL_DOCS.md` reescrito por completo

### [13/02/2026] - Fase 5: Agenda Inteligente V2
- **Feature**: Pipeline completa plan-week → solver → derived blocks → persist
- **Feature**: Timeline Solver (zero-overlap engine) em `timelineSolver.ts`
- **Feature**: Blocos derivados (pausas pós-refeição) em `derivedBlocks.ts`
- **Feature**: Replanejamento via IA (replan-day)
- **Feature**: Detecção de recorrências
- **Feature**: Planos A/B (focused vs balanced)
- **Database**: Tabelas `daily_plan`, `daily_blocks`, `fixed_blocks`
- **Context**: `dailyPlanContext.tsx` com gerenciamento completo de estado
- **UI**: `WeekView.tsx` com grade temporal 6h-21h

### [30/12/2025] - Fase 4: Infraestrutura Educacional
- **Database**: Tabelas `subjects`, `study_materials`, `flashcards`, `mindmaps` com RLS
- **Feature**: CRUD de matérias, materiais (links/texto), flashcards com SRS
- **Feature**: Perdidão V2 (wizard com sono, fixos, WeekdaySelector)
- **UI**: SubjectModal, AddMaterialModal, FlashcardReview, Sliding Tabs

### [29/12/2025] - Fase 3: Produção & Polimento
- **Feature**: Fallback robusto para motivação (frases de autores reais)
- **Fix**: Login com Google (migrado para `createBrowserClient` + `@supabase/ssr`)
- **Deploy**: v1.0.0 na Vercel (`luma-ai-pearl.vercel.app`)

### [29/12/2025] - Fase 2: Persistência & Backend
- **Infra**: Integração completa com Supabase
- **Migration**: LocalStorage → PostgreSQL
- **Feature**: Analytics com gráficos animados

### [28/12/2025] - Fase 1: MVP & IA
- **MVP**: Wizard Perdidão + Drag-and-Drop na Agenda
- **AI**: Primeira integração com Google Gemini
- **UI**: Design System base (Tailwind) + Landing Page

---

*Este documento DEVE ser atualizado a cada implementação, remoção ou refatoração. Veja `.agent/workflows/update-technical-docs.md`.*
