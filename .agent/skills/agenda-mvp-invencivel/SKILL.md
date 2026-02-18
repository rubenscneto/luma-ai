---
name: Agenda MVP Invencível
description: Contract for the Agenda system — idempotency, single writer, canonical keys, and verification protocol.
---

# SKILL — Agenda MVP Invencível
**Version:** v2 (2026-02-18)  
**Replaces:** v1  
**Changelog:** Sprint 1 (single-writer `persistDailyBlocks` + canonical keys + NOT NULL + all 8 migrations)

---

## §0 — Non-Negotiable Principles

### §0.1 Single Source of Truth
`daily_blocks` is the ONLY table for block state. No shadow arrays, no client-side merges.

### §0.2 Real Idempotency
Every block has a `NOT NULL` canonical `idempotency_key` with `UNIQUE(plan_id, idempotency_key)`.

### §0.3 Single Writer — `persistDailyBlocks()`
**ALL writes to `daily_blocks` MUST go through this helper.**  
File: `src/lib/persistDailyBlocks.ts`  
Direct `.insert()` / `.upsert()` on `daily_blocks` is **PROHIBITED** outside this file.

### §0.4 Writers Inventory (all migrated)
| # | Path | Before | After |
|---|------|--------|-------|
| 1 | `api/ai/agenda/plan-week/route.ts` | Inline UPSERT + `::2` counter | `persistDailyBlocks()` |
| 2 | `api/ai/agenda/plan-day/route.ts` | 3× raw `.insert()` | `persistDailyBlocks()` |
| 3 | `api/ai/generate-daily-plan/route.ts` | DELETE ALL + INSERT | `persistDailyBlocks()` |
| 4 | `api/ai/assistant-actions/route.ts` | Raw `.insert()` single | `persistSingleBlock()` |
| 5 | `api/ai/health/generate-blocks/route.ts` | Raw `.insert()` batch | `persistDailyBlocks()` |
| 6 | `api/agenda/blocks/route.ts` POST | Raw `.insert()` single | `persistSingleBlock()` |
| 7 | `context/dailyPlanContext.tsx` addBlock | Client-side `.insert()` | `fetch('/api/agenda/blocks')` |
| 8 | `api/ai/agenda/replan-day/route.ts` | `.update()` times only | Kept (no new blocks) |

---

## §1 — Canonical Key Generation

### `generateCanonicalKey(block, dateStr)`
Deterministic, stable, **no counter**, **no array-order dependency**.

| Type | Formula | Example |
|------|---------|---------|
| Fixed block | `fixed::{fixed_block_id}::{date}` | `fixed::abc123::2026-02-18` |
| Meal | `meal::{canonical_type}::{date}` | `meal::dinner::2026-02-18` |
| Other | `{source}::{category}::{norm_title}::{HH:MM}` | `ai::leisure::leitura::20:00` |

### Canonical Meal Types (MANDATORY)
Only these 4 values are valid for meal keys:
- `breakfast`
- `lunch`
- `snack`
- `dinner`

**NEVER** use PT-BR labels (`café`, `almoço`, `jantar`) or `unknown_meal` in keys.  
`meta.meal_type` is always written back with the canonical type.

### PROHIBITED
- `::2`, `::3` counter suffixes
- Keys based on array index or loop counter
- `mealWindow.label` in keys

---

## §2 — `persistDailyBlocks()` Contract

### Behavior
1. Generate canonical key for every block
2. Load existing blocks for `plan_id`
3. **UPSERT** by key:
   - Exists + `is_done`/`is_skipped` → preserve status, only update times
   - Exists + not done → full update
   - New → insert
4. **Stale cleanup**: delete blocks whose key NOT in new set (except preserved)
5. **Legacy cleanup**: delete blocks with `idempotency_key IS NULL`
6. Return `{ inserted, updated, deleted, preserved_done_skipped, blocks }`

### `preserved_done_skipped` metric
- Counts **per block** (max 1 per block)
- `is_done` and `is_skipped` are mutually exclusive

### Tech Debt (Sprint 1.5)
- Currently N+1 roundtrips (one query per block). Optimize to batch `.upsert()` later.

---

## §3 — DB Constraints

```sql
-- Column is NOT NULL (applied 2026-02-18)
ALTER TABLE daily_blocks ALTER COLUMN idempotency_key SET NOT NULL;

-- UNIQUE per plan (prevents dup inserts)
UNIQUE(plan_id, idempotency_key)
```

---

## §4 — Prova de Fogo (Verification Protocol)

### SQL Queries (all must return 0)
```sql
-- A: NULL keys
SELECT count(*) FROM daily_blocks WHERE idempotency_key IS NULL;

-- B1: Dup by key
SELECT plan_id, idempotency_key, count(*)
FROM daily_blocks GROUP BY 1,2 HAVING count(*) > 1;

-- B3: Dup visual
SELECT plan_id, lower(trim(title)), start_datetime, end_datetime, count(*)
FROM daily_blocks GROUP BY 1,2,3,4 HAVING count(*) > 1;

-- D1: Jantar before 18h BRT
SELECT title, start_datetime AT TIME ZONE 'America/Sao_Paulo' AS start_brt
FROM daily_blocks WHERE category='meal'
AND lower(title) LIKE '%jantar%'
AND extract(hour FROM start_datetime AT TIME ZONE 'America/Sao_Paulo') < 18;
```

### Idempotency Smoke Test
1. Click "Planejar Semana" 5× → block count per day stays constant
2. Click "Gerar com IA" 5× → same
3. "Adicionar bloco manual" 5× → same (same title+time = same key)

---

## §5 — Sprint Scope

### Sprint 1 ✅ (current)
- [x] `persistDailyBlocks()` helper
- [x] All 8 writers migrated
- [x] Canonical keys (no counter)
- [x] Canonical meal types (EN only)
- [x] `idempotency_key SET NOT NULL`
- [x] Build 0 errors
- [x] Prova de Fogo passed

### Sprint 2 (next)
- [ ] Materialize fixed blocks in DB (`source='fixed'`)
- [ ] Remove virtual merge from `dailyPlanContext.tsx`
- [ ] WeekView = DayView consistency

### Sprint 3
- [ ] AI prompt quality (`fill_target`, missing meals chat, `routine_profile`)

### Sprint 4
- [ ] Commercial (Stripe, Free/Pro plans)

### Out of scope for ALL sprints
- No `::2` counter keys
- No direct `.insert()` on `daily_blocks`
- No PT-BR labels in idempotency keys
