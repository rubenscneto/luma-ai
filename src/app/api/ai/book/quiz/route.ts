import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/ai/gemini';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { book_title, book_author, book_type, session_notes, pages_range, chapter_name } = await request.json();

    if (!book_title) {
      return NextResponse.json({ error: 'book_title required' }, { status: 400 });
    }

    const model = getGeminiModel();

    const contextParts = [];
    if (chapter_name) contextParts.push(`Capítulo: "${chapter_name}"`);
    if (pages_range) contextParts.push(`Páginas ${pages_range}`);
    if (session_notes) contextParts.push(`Anotações da sessão: "${session_notes}"`);

    const prompt = `Gere um quiz de compreensão de leitura para o livro "${book_title}" de ${book_author || 'autor desconhecido'}.
Tipo do livro: ${book_type || 'geral'}
${contextParts.length > 0 ? `Contexto: ${contextParts.join('. ')}` : ''}

Retorne um JSON com esta estrutura:
{
  "quiz_title": "Quiz: [título relevante]",
  "questions": [
    {
      "question": "Pergunta sobre o conteúdo",
      "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
      "correct_index": 0,
      "explanation": "Breve explicação da resposta correta"
    }
  ],
  "discussion_prompts": [
    "Pergunta aberta para reflexão sobre o conteúdo"
  ]
}

Regras:
- Gere 5 perguntas de múltipla escolha
- Gere 2-3 prompts de discussão/reflexão
- Tudo em português brasileiro (pt-BR)
- Para livros técnicos, foque em conceitos-chave
- Para ficção, foque em temas, personagens e enredo
- Retorne APENAS JSON válido, sem markdown`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let parsed;
    try {
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanText);
    } catch {
      parsed = {
        quiz_title: `Quiz: ${book_title}`,
        questions: [],
        discussion_prompts: ['Reflita sobre os principais temas abordados no livro.'],
      };
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Book quiz generation error:', error);
    return NextResponse.json({ error: 'Erro ao gerar quiz.' }, { status: 500 });
  }
}
