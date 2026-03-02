import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const { fileId, fileName, mimeType, accessToken, userId } = await req.json();

        if (!userId || !fileId || !fileName || !accessToken) {
            return NextResponse.json({ error: 'Missing required parameters (userId, fileId, fileName, accessToken).' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Initialize Google Drive client with the ephemeral access token
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });
        const drive = google.drive({ version: 'v3', auth });

        let fileBuffer: Buffer;
        let finalMimeType = mimeType;
        let finalExt = '';

        // Handle Google Workspace documents (they need to be exported) versus raw files (they can be downloaded natively)
        const isGoogleWorkspaceDoc = mimeType.startsWith('application/vnd.google-apps.');

        try {
            if (isGoogleWorkspaceDoc) {
                // If it's a Google Doc, export it as PDF
                if (mimeType === 'application/vnd.google-apps.document') {
                    finalMimeType = 'application/pdf';
                    finalExt = '.pdf';
                } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
                    finalMimeType = 'application/pdf';
                    finalExt = '.pdf';
                } else if (mimeType === 'application/vnd.google-apps.presentation') {
                    finalMimeType = 'application/pdf';
                    finalExt = '.pdf';
                } else {
                    finalMimeType = 'text/plain';
                    finalExt = '.txt';
                }

                const res = await drive.files.export({
                    fileId: fileId,
                    mimeType: finalMimeType,
                }, { responseType: 'arraybuffer' });

                fileBuffer = Buffer.from(res.data as ArrayBuffer);
            } else {
                // Raw files (PDFs, TXT, DOCX uploaded to drive)
                const res = await drive.files.get({
                    fileId: fileId,
                    alt: 'media'
                }, { responseType: 'arraybuffer' });

                fileBuffer = Buffer.from(res.data as ArrayBuffer);
            }
        } catch (driveError: any) {
            console.error('Google Drive API Error:', driveError);
            return NextResponse.json({ error: 'Failed to download file from Google Drive. Ensure you have the rights.' }, { status: 502 });
        }

        // Clean filename and ensure extension exists
        let cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        if (isGoogleWorkspaceDoc && !cleanName.endsWith(finalExt)) {
            cleanName += finalExt;
        }

        const storagePath = `${userId}/${Date.now()}_${cleanName}`;

        // 1. Upload to Supabase Storage (user_materials)
        const { error: uploadError } = await supabase.storage
            .from('user_materials')
            .upload(storagePath, fileBuffer, {
                contentType: finalMimeType,
                upsert: false
            });

        if (uploadError) {
            console.error('Supabase Storage Error:', uploadError);
            throw new Error(`Failed to save file in Storage: ${uploadError.message}`);
        }

        // 2. Extract Text via Gemini inline
        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-pro",
                generationConfig: { responseMimeType: "application/json" }
            });

            const prompt = `
                O usuário enviou um novo material de estudo via Google Drive. Você deve analisar o arquivo e extrair insights valiosos para a rotina de estudos dele.
                
                Retorne um JSON válido com esta exata estrutura:
                {
                    "theme": "O tema geral do documento (ex: Psicologia, Cálculo, Receitas)",
                    "summary": "Um breve resumo de no máximo 3 frases sobre o que o material aborda.",
                    "flashcards": ["Fato chave 1", "Fato chave 2"]
                }
            `;

            const documentPart = {
                inlineData: {
                    data: fileBuffer.toString("base64"),
                    mimeType: finalMimeType === 'application/pdf' ? 'application/pdf' : 'text/plain'
                }
            };

            const result = await model.generateContent([prompt, documentPart]);
            const responseText = result.response.text();
            const insights = JSON.parse(responseText || "{}");

            // 3. Save Insights to DB
            const { error: dbError } = await supabase
                .from('estudos_insights')
                .insert({
                    user_id: userId,
                    source_file: fileName,
                    material_id: storagePath, // we link to the path
                    theme: insights.theme,
                    summary: insights.summary,
                    flashcards: insights.flashcards,
                    document_type: isGoogleWorkspaceDoc ? 'google_workspace' : 'drive_raw'
                });

            if (dbError) {
                console.error('Database Error (saving insights):', dbError);
                // Keep the file intact but return error on insight generation
                throw new Error(`Failed to save insights: ${dbError.message}`);
            }

            return NextResponse.json({
                success: true,
                message: 'File imported and parsed successfully.',
                insights
            });

        } catch (aiError: any) {
            console.error('AI Logic Error:', aiError);
            // Even if AI fails, the file is in storage, but we prefer letting the user know
            return NextResponse.json({
                success: false,
                error: 'O arquivo foi importado para o Drive, mas a Inteligência Artificial falhou em extrair o resumo: ' + aiError.message
            }, { status: 207 }); // 207 Multi-Status (partial success)
        }

    } catch (error: any) {
        console.error('Drive import route error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error during Drive import' },
            { status: 500 }
        );
    }
}
