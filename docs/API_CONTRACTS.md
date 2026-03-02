# Contratos de API — Agenda Canônica (`daily_plan` + `daily_blocks`)

## Objetivo
Padronizar as APIs de agenda para **uma única fonte de verdade** no banco:
- `daily_plan` (metadado do dia)
- `daily_blocks` (blocos do dia)

## Endpoints canônicos

### `POST /api/ai/agenda/plan-day`
Gera ou atualiza o plano de um dia no modelo canônico.

**Persistência esperada**
1. Garantir `daily_plan` por `(user_id, plan_date)`.
2. Persistir blocos em `daily_blocks`.

### `POST /api/ai/agenda/plan-week`
Gera a semana e persiste dia a dia no modelo canônico.

**Persistência esperada**
1. UPSERT de `daily_plan` por data.
2. Persistência idempotente dos blocos em `daily_blocks`.

### `POST /api/ai/chat`
Quando houver ações `create_task` ou `create_project_task`, a API deve:
1. Agrupar ações por data.
2. Garantir existência de `daily_plan` por data.
3. Escrever em `daily_blocks` (sem uso de tabelas legadas).

## Endpoint legado descontinuado

### `POST /api/ai/schedule/generate`
**Status:** `410 Gone`

**Motivo:** endpoint antigo usava `agenda_items`, tabela legada fora do modelo canônico.

**Substituição:**
- Planejamento diário: `POST /api/ai/agenda/plan-day`
- Planejamento semanal: `POST /api/ai/agenda/plan-week`

## Compatibilidade e transição
- Consumidores que ainda chamam `/api/ai/schedule/generate` devem migrar para os endpoints canônicos.
- Não devem existir novas gravações em `agenda_items`.
