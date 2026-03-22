import { NextResponse } from 'next/server';
import { getRepoStructure } from '@/lib/github';

export async function POST(req: Request) {
    try {
        const { repoUrl } = await req.json();
        if (!repoUrl) return NextResponse.json({ error: "URL не указан" }, { status: 400 });

        const structure = await getRepoStructure(repoUrl);

        const response = await fetch("https://llm.api.cloud.yandex.net/foundationModels/v1/completion", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Api-Key ${process.env.YANDEX_API_KEY}`,
            },
            body: JSON.stringify({
                // Используем облегченную модель Lite (быстро и дешево)
                modelUri: `gpt://${process.env.YANDEX_FOLDER_ID}/yandexgpt-lite/latest`,
                completionOptions: {
                    stream: false,
                    temperature: 0.6,
                    maxTokens: "2000"
                },
                messages: [
                    {
                        role: "system",
                        text: "You are a professional technical writer. Write a comprehensive README.md in English for the following project structure. Use Markdown."
                    },
                    {
                        role: "user",
                        text: `Project structure:\n${structure}`
                    }
                ]
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Yandex Error Response:", result);
            throw new Error(result.message || "Ошибка Yandex Cloud");
        }

        // У Яндекса ответ лежит в result.result.alternatives[0].message.text
        const generatedText = result.result?.alternatives?.[0]?.message?.text;

        if (!generatedText) {
            throw new Error("Yandex GPT не вернул текст");
        }

        return NextResponse.json({ markdown: generatedText });

    } catch (error: any) {
        console.error("ПОЛНАЯ ОШИБКА:", error);
        return NextResponse.json({ error: "Ошибка", details: error.message }, { status: 500 });
    }
}
