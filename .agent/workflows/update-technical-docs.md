---
description: Atualizar TECHNICAL_DOCS.md sempre que algo for implementado, removido ou refatorado
---

# Workflow: Atualizar Documentação Técnica

Este workflow DEVE ser executado automaticamente ao final de qualquer tarefa que modifique código, schemas de banco, APIs, ou remova funcionalidades.

## Quando executar

- ✅ Após implementar uma nova feature
- ✅ Após corrigir um bug que altera comportamento
- ✅ Após criar/alterar/remover tabelas no Supabase
- ✅ Após criar/alterar/remover rotas de API
- ✅ Após alterar prompts de IA
- ✅ Após alterar o solver ou pipeline de geração
- ✅ Após remover código ou funcionalidades
- ❌ NÃO executar para mudanças puramente visuais (CSS, cores, espaçamento)

## Passos

1. Abrir o arquivo `TECHNICAL_DOCS.md` na raiz do projeto
// turbo

2. Identificar qual seção precisa ser atualizada:
   - **Seção 1** (Arquitetura): Se mudou stack, estrutura de diretórios
   - **Seção 2** (Banco de Dados): Se criou/alterou/removeu tabelas, colunas, constraints, índices
   - **Seção 3** (Pipeline IA): Se alterou fluxo de geração, solver, prompts, derivedBlocks
   - **Seção 4** (Frontend State): Se mudou contexts, state management, ações
   - **Seção 5** (Schemas JSON): Se alterou contratos Zod/JSON da IA
   - **Seção 6** (Problemas Conhecidos): Se corrigiu ou identificou novos bugs
   - **Seção 7** (Prompts IA): Se alterou prompts base ou de agenda

3. Atualizar a seção correspondente com a informação nova

4. Atualizar o **Diário de Bordo** (Changelog) no final do arquivo:
   - Adicionar nova entrada com data `[DD/MM/YYYY]`
   - Descrever o que foi feito em bullet points concisos
   - Formato: `- **Tipo**: Descrição breve`
   - Tipos válidos: Feature, Fix, Database, API, UI, Refactor, Remove, Deploy, Docs

5. Atualizar a **data de última atualização** no topo do arquivo

6. Se um problema da Seção 6 foi corrigido, remover da tabela ou marcar como ✅ resolvido

## Exemplo de entrada no changelog

```markdown
### [18/02/2026] - Correção do Skip Block
- **Fix**: `skipBlock` não chama mais `triggerReplan` para evitar refetch que desfaz optimistic update
- **Refactor**: Separado `loadTodayPlan` em `loadFromDB` e `applyOptimistic`
```
