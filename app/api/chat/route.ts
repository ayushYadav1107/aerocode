import { type NextRequest, NextResponse } from "next/server"
import { normalizeCodeFences } from "./normalize-code-fences"
import { groqChat, type ChatMessage as GroqMessage } from "@/lib/groq"

interface ChatMessage {
    role: "user" | "assistant"
    content: string
}

interface EnhancePromptRequest {
    prompt: string
    context?: {
        fileName?: string
        language?: string
        codeContent?: string
    }
}

async function generateAIResponse(messages: ChatMessage[]) {
    const systemPrompt = `You are an expert AI coding assistant. You help developers with:
- Code explanations and debugging
- Best practices and architecture advice
- Writing clean, efficient code
- Troubleshooting errors
- Code reviews and optimizations

Always provide clear, practical answers. Keep responses concise but comprehensive.

FORMATTING RULES (required):
- Every piece of code MUST be inside a fenced block that opens with three backticks followed immediately by the language, e.g. \`\`\`python
- Never emit code as plain text or indented text. Never open a fence without a language tag.
- Close every fence with three backticks on their own line.
- Write explanations as prose OUTSIDE the fences, never as comments inside them.`

    const groqMessages: GroqMessage[] = [
        { role: "system", content: systemPrompt },
        ...messages,
    ]

    return groqChat(groqMessages, { temperature: 0.7, maxTokens: 1000 })
}

async function enhancePrompt(request: EnhancePromptRequest) {
    const enhancementPrompt = `You are a prompt enhancement assistant. Take the user's basic prompt and enhance it to be more specific, detailed, and effective for a coding AI assistant.

Original prompt: "${request.prompt}"

Context: ${request.context ? JSON.stringify(request.context, null, 2) : "No additional context"}

Enhanced prompt should:
- Be more specific and detailed
- Include relevant technical context
- Ask for specific examples or explanations
- Be clear about expected output format
- Maintain the original intent

Return only the enhanced prompt, nothing else.`

    try {
        const result = await groqChat(
            [{ role: "user", content: enhancementPrompt }],
            { temperature: 0.3, maxTokens: 500 },
        )
        return result || request.prompt
    } catch (error) {
        console.error("Prompt enhancement error:", error)
        return request.prompt // Return original if enhancement fails
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // Handle prompt enhancement
        if (body.action === "enhance") {
            const enhancedPrompt = await enhancePrompt(body as EnhancePromptRequest)
            return NextResponse.json({ enhancedPrompt })
        }

        // Handle regular chat
        const { message, history, language } = body

        if (!message || typeof message !== "string") {
            return NextResponse.json({ error: "Message is required and must be a string" }, { status: 400 })
        }

        const validHistory = Array.isArray(history)
            ? history.filter(
                (msg: any) =>
                    msg &&
                    typeof msg === "object" &&
                    typeof msg.role === "string" &&
                    typeof msg.content === "string" &&
                    ["user", "assistant"].includes(msg.role),
            )
            : []

        const recentHistory = validHistory.slice(-10)
        const messages: ChatMessage[] = [...recentHistory, { role: "user", content: message }]

        const aiResponse = await generateAIResponse(messages)

        if (!aiResponse) {
            throw new Error("Empty response from AI model")
        }

        return NextResponse.json({
            response: normalizeCodeFences(aiResponse, language),
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error("Error in AI chat route:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
        return NextResponse.json(
            {
                error: "Failed to generate AI response",
                details: errorMessage,
                timestamp: new Date().toISOString(),
            },
            { status: 500 },
        )
    }
}

export async function GET() {
    return NextResponse.json({
        status: "AI Chat API is running",
        timestamp: new Date().toISOString(),
        info: "Use POST method to send chat messages or enhance prompts",
    })
}