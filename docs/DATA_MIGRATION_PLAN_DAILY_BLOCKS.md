# Plano de Migração — `agenda_items` → `daily_plan` + `daily_blocks`

## Contexto
Dados históricos podem existir em `agenda_items` (modelo legado). O modelo oficial agora é:
- `daily_plan`: um registro por usuário+data
- `daily_blocks`: blocos da agenda associados ao `plan_id`

## Estratégia

### 1) Pré-checagens
- Levantar volume por usuário e por data em `agenda_items`.
- Mapear categorias legadas para categorias aceitas em `daily_blocks`.
- Validar timezone padrão por usuário (fallback: UTC).

### 2) Backfill de `daily_plan`
Para cada combinação única `(user_id, date)` em `agenda_items`:
- criar/garantir `daily_plan` com `ON CONFLICT (user_id, plan_date) DO NOTHING`.

### 3) Conversão para `daily_blocks`
Para cada item legado:
- `title` → `title`
- `category` → `category` (normalizada)
- `date + start_time` → `start_datetime`
- `duration` → `end_datetime = start_datetime + duration`
- `generated=true` → `source='ai'`; caso contrário `source='manual'`
- metadados legados → `meta.legacy_agenda_item_id`

### 4) Idempotência
- Rodar migração por lotes com chave de idempotência lógica (ex.: `legacy::{agenda_item_id}`).
- Evitar duplicar blocos quando o script for reexecutado.

### 5) Validação pós-migração
- Contagem por usuário/data entre origem e destino.
- Amostragem manual de datas críticas.
- Conferir ausência de sobreposição extrema e categorias inválidas.

### 6) Corte e limpeza
- Congelar escrita em `agenda_items`.
- Manter leitura de contingência por janela curta (se necessário).
- Arquivar/limpar `agenda_items` após estabilização.

## SQL de referência (ajustar antes de produção)

```sql
-- 1) Garantir daily_plan por user/date
insert into daily_plan (user_id, plan_date, timezone, status)
select distinct ai.user_id, ai.date::date as plan_date, 'UTC' as timezone, 'active' as status
from agenda_items ai
on conflict (user_id, plan_date) do nothing;

-- 2) Inserir em daily_blocks a partir de agenda_items
insert into daily_blocks (
  plan_id, user_id, title, category, start_datetime, end_datetime, source, meta
)
select
  dp.id as plan_id,
  ai.user_id,
  ai.title,
  ai.category,
  (ai.date::text || 'T' || ai.start_time::text || ':00Z')::timestamptz as start_datetime,
  ((ai.date::text || 'T' || ai.start_time::text || ':00Z')::timestamptz + make_interval(mins => ai.duration)) as end_datetime,
  case when ai.generated then 'ai' else 'manual' end as source,
  jsonb_build_object('legacy_agenda_item_id', ai.id) as meta
from agenda_items ai
join daily_plan dp
  on dp.user_id = ai.user_id
 and dp.plan_date = ai.date::date;
```

> Observação: revisar timezone real dos usuários antes da execução final para não deslocar blocos.
