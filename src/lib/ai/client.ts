export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function sendChatMessage(message: string, history: ChatMessage[] = []) {
    const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Chat request failed");
    }

    return res.json() as Promise<{ userName: string; reply: string; actions: any[] }>;
}
