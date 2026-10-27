import { NextResponse } from "next/server";

type Provider = "llama405" | "llama70" | "openai" | "claude" | "gemini" | "grok" | "ollama";
type Length = "short" | "medium" | "long";

interface GenerateRequest {
  inputText: string;
  llmProvider: Provider;
  targetLanguage: string;
  tone: string;
  platform: string;
  contentLength: Length;
  researchMode: boolean;
  conversation?: Array<{ role: "user" | "assistant"; content: string }>;
}

const providerConfig: Record<Provider, { key?: string; model: string }> = {
  llama405: { key: "GROQ_API_KEY", model: "llama-3.1-405b-reasoning" },
  llama70: { key: "GROQ_API_KEY", model: "llama-3.3-70b-versatile" },
  openai: { key: "OPENAI_API_KEY", model: "gpt-4o" },
  claude: { key: "ANTHROPIC_API_KEY", model: "claude-3-5-sonnet-latest" },
  gemini: { key: "GOOGLE_AI_API_KEY", model: "gemini-1.5-pro" },
  grok: { key: "XAI_API_KEY", model: "grok-2-latest" },
  ollama: { model: "llama3" },
};

function systemPrompt(payload: GenerateRequest, research: string[], keywords: string[]): string {
  const lengthGuide = { short: "under 80 words", medium: "120–180 words", long: "250–350 words" };
  return `You are a careful social content writer for /hossain.bills. Adapt the supplied material for ${payload.platform} in ${payload.targetLanguage}, using a ${payload.tone} tone and ${lengthGuide[payload.contentLength]} length. Preserve the source meaning, distinguish facts from opinion, never invent a quote, statistic, citation, or claim of verification. Use relevant keywords naturally: ${keywords.join(", ") || "none extracted"}. Research context (unverified unless linked sources are supplied): ${research.join("\n") || "No live research available."}. Return only the post copy, with hashtags when suitable.`;
}

async function fetchResearch(query: string): Promise<{ summaries: string[]; sources: string[] }> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return { summaries: [], sources: [] };
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, query, topic: "news", max_results: 4, include_answer: false }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return { summaries: [], sources: [] };
  const data = (await response.json()) as { results?: Array<{ title?: string; content?: string; url?: string }> };
  const results = data.results ?? [];
  return {
    summaries: results.map((item) => `${item.title ?? "Source"}: ${item.content ?? ""}`),
    sources: results.flatMap((item) => item.url ? [item.url] : []),
  };
}

async function complete(payload: GenerateRequest, prompt: string, onToken: (text: string) => void): Promise<string> {
  const config = providerConfig[payload.llmProvider];
  if (payload.llmProvider === "claude") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: config.model, max_tokens: 1200, system: prompt, messages: payload.conversation?.length ? payload.conversation : [{ role: "user", content: payload.inputText }] }),
      signal: AbortSignal.timeout(60_000),
    });
    const data = await response.json() as { content?: Array<{ text?: string }>; error?: { message?: string } };
    if (!response.ok) throw new Error(data.error?.message ?? "Claude request failed");
    const content = data.content?.map((item) => item.text ?? "").join("") ?? "";
    onToken(content);
    return content;
  }
  if (payload.llmProvider === "gemini") {
    const key = process.env.GOOGLE_AI_API_KEY;
    if (!key) throw new Error("GOOGLE_AI_API_KEY is not configured");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_instruction: { parts: [{ text: prompt }] }, contents: [{ role: "user", parts: [{ text: payload.conversation?.at(-1)?.content ?? payload.inputText }] }] }),
      signal: AbortSignal.timeout(60_000),
    });
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
    if (!response.ok) throw new Error(data.error?.message ?? "Gemini request failed");
    const content = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    onToken(content);
    return content;
  }
  const baseUrl = payload.llmProvider === "ollama" ? "http://localhost:11434/v1/chat/completions" : payload.llmProvider === "grok" ? "https://api.x.ai/v1/chat/completions" : payload.llmProvider.startsWith("llama") ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
  const key = payload.llmProvider === "ollama" ? "ollama" : process.env[config.key ?? ""];
  if (!key) throw new Error(`${config.key} is not configured`);
  const messages = [{ role: "system", content: prompt }, ...(payload.conversation?.length ? payload.conversation : [{ role: "user" as const, content: payload.inputText }])];
  const response = await fetch(baseUrl, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: config.model, messages, temperature: 0.7, stream: true }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Provider request failed (${response.status}): ${detail.slice(0, 240)}`);
  }
  if (!response.body) throw new Error("Provider returned an empty stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      try {
        const token = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content ?? "";
        output += token;
        if (token) onToken(token);
      } catch { /* Ignore malformed provider keepalive frames. */ }
    }
    if (done) break;
  }
  return output;
}

function extractKeywords(text: string): string[] {
  const stop = new Set(["this", "that", "with", "from", "have", "your", "about", "what", "when", "will", "they", "them", "there", "their", "into", "than", "then", "here", "just", "like", "more", "some", "want", "make", "english", "post"]);
  const counts = new Map<string, number>();
  for (const token of text.toLocaleLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []) if (!stop.has(token)) counts.set(token, (counts.get(token) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word]) => word);
}

export async function POST(request: Request) {
  let payload: GenerateRequest;
  try { payload = await request.json() as GenerateRequest; } catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
  if (typeof payload.inputText !== "string" || !payload.inputText.trim() || payload.inputText.length > 12_000) return NextResponse.json({ error: "Add text or a topic (up to 12,000 characters)" }, { status: 400 });
  if (!(payload.llmProvider in providerConfig) || typeof payload.targetLanguage !== "string" || typeof payload.tone !== "string" || typeof payload.platform !== "string" || !["short", "medium", "long"].includes(payload.contentLength)) return NextResponse.json({ error: "One or more generation settings are invalid" }, { status: 400 });
  try {
    const research = payload.researchMode ? await fetchResearch(payload.inputText).catch(() => ({ summaries: [], sources: [] })) : { summaries: [], sources: [] };
    const keywords = extractKeywords(payload.inputText);
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "meta", keywords, sources: research.sources, researchAvailable: !payload.researchMode || Boolean(research.sources.length), provider: payload.llmProvider })}\n\n`));
        let hasContent = false;
        try {
          await complete(payload, systemPrompt(payload, research.summaries, keywords), (text) => {
            hasContent ||= Boolean(text.trim());
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", text })}\n\n`));
          });
          if (!hasContent) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: "The selected provider returned no content" })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Content generation failed";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } finally { controller.close(); }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Content generation failed";
    const status = message.includes("not configured") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
