# LumaAI - Documentação Técnica & Diário de Bordo 🛠️

**Versão Atual**: 1.0.0 (Production Ready)
**Data de Início**: Dezembro 2025

Este documento serve como referência técnica profunda do sistema LumaAI e como um registro cronológico (Diário de Bordo) de todas as implementações e decisões arquiteturais.

---

## 1. Arquitetura do Sistema

O LumaAI é uma aplicação **SaaS (Software as a Service)** construída com uma arquitetura "Serverless & Edge-ready", priorizando performance e escalabilidade.

### Stack Tecnológico
*   **Frontend Framework**: Next.js 14+ (App Router)
*   **Linguagem**: TypeScript (Strict Mode)
*   **Estilização**: TailwindCSS + Framer Motion (Animações)
*   **Backend / Database**: Supabase (PostgreSQL + Auth)
*   **Inteligência Artificial**: Google Gemini API (`gemini-1.5-flash`)
*   **Deploy**: Vercel

### Estrutura de Diretórios (App Router)
A aplicação utiliza o roteamento baseado em arquivos do Next.js:
*   `src/app/(public)`: Rotas públicas (Landing, Login, Register). Isoladas para não carregar o Layout da aplicação.
*   `src/app/(app)`: Rotas protegidas (Dashboard, Agenda, etc). Envolvidas num Layout que contém a `Sidebar` e verifica a autenticação.
*   `src/api/*`: Rotas de API (Server Functions) para comunicar com a IA e processar dados sensíveis.

---

## 2. Integração com Inteligência Artificial (Core)

A "mágica" do LumaAI reside no `src/services/geminiService.ts`. O sistema não apenas "chama" a IA, mas gerencia falhas e estrutura dados.

### Fluxo de Geração de Rotina ("O Perdidão")
1.  **Coleta de Dados**: O usuário preenche um Wizard (Occupation, Wake up time, Focus Area).
2.  **Prompt Engineering**: O sistema constrói um prompt complexo em JSON, instruindo o Gemini a agir como um especialista em produtividade.
    *   *Exemplo*: "Crie uma rotina para um [Advogado] que acorda às [06:00], focando em [Saúde]."
3.  **Sanitização**: A resposta da IA (muitas vezes texto sujo) é limpa via Regex para extrair apenas o JSON válido.
4.  **Fallback System (Segurança)**: Se a API falhar (timeout ou erro de chave), o sistema ativa o "Mock Inteligente", gerando uma rotina baseada em algoritmos locais para que o usuário nunca fique sem resposta.

### Motivação Diária (Robustez)
*   **Real-time AI**: Todo dia o sistema pede uma frase nova.
*   **Cache Inteligente**: Se a frase for genérica ("Luma AI"), o frontend força uma nova busca.
*   **Fallback de Gênios**: Lista interna com frases de Steve Jobs, Einstein, etc., usada caso a IA esteja offline.

---

## 3. Banco de Dados & Persistência

Utilizamos o **Supabase** como Backend-as-a-Service.

### Schema (SQL)
*   `profiles`: Dados do usuário (nome, metas). Sincronizado via Trigger no Auth.
*   `routines`: A tabela core. Armazena blocos de tempo.
    *   `start_time`: TIME
    *   `duration`: INTEGER (minutos)
    *   `type`: ENUM (work, study, health...)

### Segurança
*   **RLS (Row Level Security)**: Habilitado em todas as tabelas. Um usuário só pode ver/editar suas próprias rotinas (`auth.uid() = user_id`).

---

## 4. Frontend & State Management

Não usamos Redux. O estado é gerenciado via **React Context API**, dividindo responsabilidades:
*   `AuthContext`: Gerencia Sessão (User + Token). Usa Cookies para persistência segura e compatibilidade com SSR.
*   `RoutineContext`: O "cérebro" do frontend. Sincroniza o estado local com o Supabase. Se o usuário estiver offline, ele lê do LocalStorage (Optimistic UI).

---

## 📅 Diário de Bordo (Changelog)

### [30/12/2025] - Fase 4: Infraestrutura Educacional & Matérias
*   **Database**: Criação de tabelas `subjects`, `study_materials`, `flashcards`, `mindmaps` com RLS.
*   **Feature (Subject Manager)**: Implementação do CRUD de matérias no `StudyContext`.
*   **Frontend**: Página `/estudos` agora conecta com o Supabase para adicionar/remover matérias.
*   **UI Update**: Substituído input simples por `SubjectModal` (Wizard) com Meta e Dificuldade.
*   **Routing**: Criada página dinâmica `/estudos/[subjectId]` com abas (Visão Geral, Materiais, Flashcards).
*   **Components**: Novos componentes `Tabs`, `Dialog`, `Label` adicionados à biblioteca UI.

*   **Feature (Materials)**: Implementado `AddMaterialModal` com suporte a Links e Texto.
*   **Database**: Utilizada tabela `study_materials` para persistência.
*   **UI Update**: Aba "Materiais" agora lista itens com opção de abrir link e deletar.

*   **UI/UX**: Refinamento visual com `framer-motion`. Adicionado efeito "Sliding Tabs" na página de detalhes.
*   **Accessibility**: Melhorado contraste do badge de Nível e Headers das abas (Fixed active text visibility).
*   **Feature (Materials)**: Implementado `AddMaterialModal` com suporte a Links e Texto.

### [29/12/2025] - Fase 3: Produção & Polimento (Final)
*   **Feature**: Implementado Fallback Robusto para Motivação. Agora exibe frases de autores reais (Jobs, Churchill) se a IA falhar.
*   **Fix**: Correção crítica no Login com Google. O app redirecionava para Home por não ler o Cookie de sessão. Migrado para `createBrowserClient` (+ `@supabase/ssr`).
*   **UI**: Remoção de tags de debug ("Issue") da Landing Page.
*   **UI**: Limpeza de dados "Mock" (prioridades falsas) do Dashboard. Agora inicia limpo.
*   **Deploy**: Versão 1.0.0 estável publicada na Vercel (`luma-ai-pearl.vercel.app`).

### [29/12/2025] - Fase 2: Persistência & Backend
*   **Infra**: Integração completa com Supabase.
*   **Migration**: Substituição do sistema de "salvar no navegador" (LocalStorage) por Banco de Dados Real.
*   **Feature**: Página de Analytics criada com gráficos animados via `framer-motion`.

### [28/12/2025] - Fase 1: MVP & IA
*   **MVP**: Criação do Wizard "Perdidão" e lógica de Drag-and-Drop na Agenda.
*   **AI**: Primeira integração com Google Gemini para gerar rotinas em JSON.
*   **Frontend**: Design System base (Tailwind) e Landing Page.

---

*Este documento deve ser atualizado a cada nova 'Major Feature' ou refatoração crítica.*
