import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/ai/gemini';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { pdf_base64, subject_name, filename } = await request.json();

        if (!pdf_base64) {
            return NextResponse.json({ error: 'PDF content required' }, { status: 400 });
        }

        const model = getGeminiModel();

        const prompt = `Analise o conteúdo deste PDF${subject_name ? ` da matéria "${subject_name}"` : ''} (arquivo: ${filename || 'documento.pdf'}).

Retorne um JSON com a seguinte estrutura:
{
  "summary": "Resumo conciso de 3-5 frases do conteúdo principal do documento",
  "keyTopics": ["tópico1", "tópico2", ...],  // Lista de 5-10 tópicos-chave encontrados
  "flashcards": [
    { "question": "Pergunta sobre o conteúdo", "answer": "Resposta concisa" },
    // Gere 5-8 flashcards
  ],
  "studyTips": ["Dica 1", "Dica 2", ...] // 3-5 dicas de estudo específicas para este conteúdo
}

Regras:
- Responda APENAS em português brasileiro (pt-BR)
- O resumo deve ser claro e objetivo
- Os tópicos devem ser específicos, não genéricos
- Os flashcards devem cobrir conceitos-chave
- As dicas devem ser acionáveis e específicas ao conteúdo
- Retorne APENAS JSON válido, sem markdown`;

        const result = await model.generateContent([
            { text: prompt },
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: pdf_base64,
                },
            },
        ]);

        const text = result.response.text();

        // Parse response
        let parsed;
        try {
            const cleanText = text
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            parsed = JSON.parse(cleanText);
        } catch {
            // Fallback parsing
            parsed = {
                summary: text.substring(0, 500),
                keyTopics: [],
                flashcards: [],
                studyTips: [],
            };
        }

        return NextResponse.json(parsed);
    } catch (error) {
        console.error('PDF analysis error:', error);
        return NextResponse.json({ error: 'Erro ao analisar o PDF.' }, { status: 500 });
    }
}
