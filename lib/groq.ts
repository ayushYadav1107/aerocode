// Groq's chat completions endpoint is OpenAI-compatible, so this is a plain
// fetch rather than a dependency. Free tier: https://console.groq.com/keys
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b"
const TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS) || 30_000

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

export async function groqChat(
    messages: ChatMessage[],
    options: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
        throw new Error(
            "GROQ_API_KEY is not set. Get a free key at https://console.groq.com/keys",
        )
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
        const response = await fetch(GROQ_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 1000,
            }),
            signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
            const errorText = await response.text()
            console.error("Groq API error:", response.status, errorText)
            if (response.status === 401) {
                throw new Error("GROQ_API_KEY is invalid. Check the key at https://console.groq.com/keys")
            }
            if (response.status === 429) {
                throw new Error("Groq's free-tier rate limit was hit. Wait a moment and try again.")
            }
            throw new Error(`Groq API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content
        if (!content) throw new Error("Empty response from Groq")
        return content.trim()
    } catch (error) {
        clearTimeout(timeoutId)
        if ((error as Error).name === "AbortError") {
            throw new Error(`Groq took longer than ${Math.round(TIMEOUT_MS / 1000)}s to respond. Try again.`)
        }
        throw error
    }
}
