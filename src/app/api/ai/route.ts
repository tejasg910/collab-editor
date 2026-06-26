import { streamText } from "ai"
import { groq } from "@ai-sdk/groq"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return new Response("Unauthorized", { status: 401 })

  const body = await req.json()
  const { action, content, selection } = body as {
    action: string
    content: string
    selection?: string
  }

  const target = selection?.trim() || content?.trim() || ""
  if (!target) return new Response("No content", { status: 400 })

  const prompts: Record<string, string> = {
    improve: `You are a writing assistant. Improve the clarity, flow, and engagement of the following text. Keep the same meaning and approximate length. Return ONLY the improved text, no explanations or preamble:\n\n${target}`,
    summarize: `Summarize the following document in 2-3 concise sentences. Capture the key points. Return ONLY the summary:\n\n${target}`,
    continue: `You are a writing assistant. Continue writing naturally from where the following text ends. Add 2-3 sentences that flow seamlessly from the existing content. Return ONLY the continuation (do not repeat the original):\n\n${target}`,
    grammar: `Fix all grammar, spelling, and punctuation errors in the following text. Do not change the style or content. Return ONLY the corrected text:\n\n${target}`,
    shorten: `Shorten the following text by about half while preserving all key information. Return ONLY the shortened text:\n\n${target}`,
    expand: `Expand the following text with more detail and explanation, roughly doubling its length. Keep the same tone. Return ONLY the expanded text:\n\n${target}`,
  }

  const prompt = prompts[action]
  if (!prompt) return new Response("Invalid action", { status: 400 })

  const result = streamText({
    model: groq("llama-3.1-8b-instant"),
    prompt,
    maxOutputTokens: 1024,
    temperature: 0.7,
  })

  return result.toTextStreamResponse()
}
