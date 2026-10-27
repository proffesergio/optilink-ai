"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Copy, Download, ExternalLink, FileText, Globe2, Image as ImageIcon, LoaderCircle, Plus, Sparkles } from "lucide-react";
type Provider = "llama405" | "llama70" | "openai" | "claude" | "gemini" | "grok" | "ollama";
type Message = { role: "user" | "assistant"; content: string; keywords?: string[]; sources?: string[]; researchAvailable?: boolean };
type SavedThread = { id: number; title: string; messages: Message[] };
const providers: Array<[Provider, string]> = [["llama405", "Meta AI · Llama 3.1 405B (Groq)"], ["llama70", "Llama 3 · 70B (Groq)"], ["openai", "OpenAI · GPT-4o"], ["claude", "Claude · 3.5 Sonnet"], ["gemini", "Gemini · 1.5 Pro"], ["grok", "Grok"], ["ollama", "Local · Ollama (llama3)" ]];
const languages = ["Bangla", "English", "Hinglish", "Hindi", "Arabic", "Spanish"];
const platforms = ["Facebook", "LinkedIn", "X / Twitter", "Instagram caption", "Blog SEO"];
const tones = ["Storytelling", "Professional", "Emotional", "Breaking news", "Funny", "Reflective / Islamic"];

/** Reusable three-panel writing workspace with provider-backed generation and local thread history. */
export function ChatStudio() {
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<Provider>("llama70");
  const [language, setLanguage] = useState("Bangla");
  const [platform, setPlatform] = useState("Facebook");
  const [tone, setTone] = useState("Storytelling");
  const [length, setLength] = useState("medium");
  const [research, setResearch] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [customLanguage, setCustomLanguage] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [webView, setWebView] = useState(false);
  const [savedThreads, setSavedThreads] = useState<SavedThread[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const latest = [...messages].reverse().find((message) => message.role === "assistant");
  const allKeywords = latest?.keywords ?? [];
  const tags = allKeywords.map((word) => `#${word.replace(/[^\p{L}\p{N}]/gu, "")}`).filter((tag) => tag.length > 1).slice(0, 6);
  const displayLanguage = customLanguage.trim() || language;

  useEffect(() => {
    const stored = localStorage.getItem("optilink-content-threads");
    if (!stored) return;
    const timer = window.setTimeout(() => {
      try { setSavedThreads(JSON.parse(stored) as SavedThread[]); }
      catch { setSavedThreads([]); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function generate(text = input, continuation = false) {
    if (!text.trim() || busy) return;
    const nextMessages: Message[] = continuation ? [...messages, { role: "user", content: text }] : [{ role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inputText: text, llmProvider: provider, targetLanguage: displayLanguage, tone, platform, contentLength: length, researchMode: research, conversation: continuation ? nextMessages : undefined }) });
      if (!response.ok) {
        const body = await response.json() as { error?: string };
        throw new Error(body.error ?? "Could not generate content");
      }
      if (!response.body) throw new Error("The generation stream is unavailable");
      setMessages((current) => [...current, { role: "assistant", content: "", keywords: [], sources: [], researchAvailable: !research }]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const dataLine = frame.split("\n").find((line) => line.startsWith("data: "));
          if (!dataLine || dataLine === "data: [DONE]") continue;
          const event = JSON.parse(dataLine.slice(6)) as { type: string; text?: string; error?: string; keywords?: string[]; sources?: string[]; researchAvailable?: boolean };
          if (event.type === "error") throw new Error(event.error ?? "Content generation failed");
          if (event.type === "token") setMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, content: message.content + (event.text ?? "") } : message));
          if (event.type === "meta") setMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, keywords: event.keywords, sources: event.sources, researchAvailable: event.researchAvailable } : message));
          bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }
        if (done) break;
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Generation failed"); }
    finally { setBusy(false); }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function saveThread() {
    if (!messages.length) return;
    const next = [{ id: Date.now(), title: messages.find((message) => message.role === "user")?.content.slice(0, 72) ?? "Content draft", messages }, ...savedThreads].slice(0, 30);
    setSavedThreads(next);
    localStorage.setItem("optilink-content-threads", JSON.stringify(next));
  }

  function downloadImage(text: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1080;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#f8faf3"; context.fillRect(0, 0, 1080, 1080);
    context.fillStyle = "#24352b"; context.font = "bold 34px Arial";
    const words = text.split(/\s+/); let line = ""; let y = 180;
    for (const word of words) { const candidate = `${line}${word} `; if (context.measureText(candidate).width > 850 && line) { context.fillText(line, 110, y); y += 54; line = `${word} `; } else line = candidate; if (y > 900) break; }
    if (line && y <= 900) context.fillText(line, 110, y);
    const link = document.createElement("a"); link.download = "optilink-post.png"; link.href = canvas.toDataURL("image/png"); link.click();
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-sm font-semibold text-[#5a6f28]">Content tools / Studio</p><h1 className="text-3xl font-bold tracking-[-0.06em] sm:text-4xl">Content studio<span className="text-[#b7cc5b]">.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#5d6d64]">Shape one idea into platform ready content, review it in context, then decide what to publish.</p></div><button onClick={() => { setMessages([]); setError(""); }} className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6dc] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#f9fbf7]"><Plus size={16}/> New thread</button></div>
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(260px,0.85fr)_minmax(400px,1.35fr)_minmax(250px,0.72fr)]">
      <section className="rounded-2xl border border-[#e0e6df] bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><Sparkles size={16} className="text-[#81984b]"/><h2 className="text-sm font-bold">Create a post</h2></div><label className="mb-2 block text-xs font-semibold text-[#65736a]">Paste English post / paragraph / topic / link<textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Start with an idea, a link, or a rough draft…" className="mt-2 min-h-36 w-full resize-y rounded-xl border border-[#e1e7df] bg-[#fbfcfa] p-3 text-sm leading-6 outline-none placeholder:text-[#a4afa7] focus:border-[#b0c35e]" /></label>
        <Field label="LLM engine"><select value={provider} onChange={(event) => setProvider(event.target.value as Provider)} className={selectClass}>{providers.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>
        <Field label="Target language"><div className="flex gap-2"><select value={language} onChange={(event) => { setLanguage(event.target.value); setShowCustom(event.target.value === "Add custom…"); }} className={selectClass}>{languages.map((value) => <option key={value}>{value}</option>)}<option>Add custom…</option></select>{showCustom && <input value={customLanguage} onChange={(event) => setCustomLanguage(event.target.value)} placeholder="Language" className={selectClass}/>}</div></Field>
        <Field label="Platform"><select value={platform} onChange={(event) => setPlatform(event.target.value)} className={selectClass}>{platforms.map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Tone"><select value={tone} onChange={(event) => setTone(event.target.value)} className={selectClass}>{tones.map((value) => <option key={value}>{value}</option>)}</select></Field>
        <div className="mt-4"><div className="flex justify-between text-xs font-semibold text-[#65736a]"><span>Content length</span><span className="capitalize text-[#829548]">{length}</span></div><input type="range" min="0" max="2" value={["short", "medium", "long"].indexOf(length)} onChange={(event) => setLength(["short", "medium", "long"][Number(event.target.value)])} className="mt-2 w-full accent-[#98ad4f]"/><div className="flex justify-between text-[10px] text-[#a1aba3]"><span>Short</span><span>Medium</span><span>Long</span></div></div>
        <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl bg-[#f6f8f3] p-3 text-xs font-semibold text-[#536258]">Research mode <input type="checkbox" checked={research} onChange={(event) => setResearch(event.target.checked)} className="h-4 w-4 accent-[#839748]"/></label>
        <button onClick={() => void generate()} disabled={busy || !input.trim()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e2e27] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#34483c] disabled:cursor-not-allowed disabled:opacity-50"><Sparkles size={16}/> Generate magic</button>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</p>}
      </section>

      <section className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-[#e0e6df] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#e9ede6] px-5 py-4"><div><h2 className="text-sm font-bold">Studio chat</h2><p className="mt-1 text-[11px] text-[#95a097]">A private draft room · nothing publishes automatically</p></div><div className="flex gap-1 rounded-lg bg-[#f4f6f1] p-1"><button onClick={() => setWebView(false)} className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${!webView ? "bg-white shadow-sm" : "text-[#89968e]"}`}>Chat</button><button onClick={() => setWebView(true)} className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${webView ? "bg-white shadow-sm" : "text-[#89968e]"}`}>Web view</button></div></div>
        {webView ? <div className="flex-1 p-5"><div className="mb-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800"><ExternalLink size={15} className="mt-0.5 shrink-0"/>External chat sites may block iframe embedding. Use the provider-backed chat here for your saved generation thread.</div><iframe src="https://www.meta.ai" title="Meta AI web view" className="h-[470px] w-full rounded-xl border border-[#e5e9e2]" referrerPolicy="no-referrer" sandbox="allow-scripts allow-forms allow-same-origin allow-popups"/></div> : <><div className="flex-1 space-y-5 overflow-y-auto bg-[#fbfcfa] p-5">{messages.length === 0 ? <div className="grid min-h-[480px] place-items-center text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#edf3df] text-[#7e9545]"><Sparkles size={20}/></div><h3 className="mt-4 font-bold">Your next post starts here</h3><p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-[#929e95]">Add a topic on the left. Refine the draft right here with follow up instructions.</p></div></div> : messages.map((message, index) => <div key={`${index}-${message.role}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}><div className={message.role === "user" ? "max-w-[88%] rounded-2xl rounded-br-md bg-[#eaf0df] px-4 py-3 text-sm leading-6 text-[#344232]" : "w-full max-w-[94%] rounded-2xl rounded-bl-md border border-[#e9ede7] bg-white px-4 py-4 text-sm leading-7 text-[#35433b] shadow-sm"}>{message.role === "user" ? <><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#84964e]">You</span>{message.content}</> : <><span className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#84964e]"><Sparkles size={12}/> Draft · {platform}</span><p className="whitespace-pre-wrap">{message.content || (busy ? "Thinking and drafting…" : "")}</p>{message.content && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#eef0ec] pt-3"><button onClick={() => void copy(message.content)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5f7f2] px-2.5 py-1.5 text-[11px] font-semibold text-[#64734a]">{copied ? <Check size={13}/> : <Copy size={13}/>} {copied ? "Copied" : "Copy"}</button><button onClick={() => downloadImage(message.content)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5f7f2] px-2.5 py-1.5 text-[11px] font-semibold text-[#64734a]"><ImageIcon size={13}/> Download image</button><button onClick={() => { const blob = new Blob([message.content], { type: "text/plain" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "optilink-draft.txt"; link.click(); URL.revokeObjectURL(link.href); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5f7f2] px-2.5 py-1.5 text-[11px] font-semibold text-[#64734a]"><Download size={13}/> .txt</button><button onClick={saveThread} className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5f7f2] px-2.5 py-1.5 text-[11px] font-semibold text-[#64734a]"><FileText size={13}/> Save history</button></div>}<div className="mt-3 rounded-lg bg-[#fff8e9] p-2.5 text-[11px] leading-5 text-[#806b41]">{message.researchAvailable ? "Research sources attached. Verify details before publishing." : research ? "Live research is not configured or returned no sources. Treat factual claims as unverified." : "Research mode is off. Review factual claims before publishing."}{message.sources?.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[#687e42] underline">{url}</a>)}</div></>}</div></div>)}{busy && messages.at(-1)?.role === "assistant" && !messages.at(-1)?.content && <div className="flex items-center gap-2 text-xs text-[#87948b]"><LoaderCircle size={14} className="animate-spin"/> Preparing your draft…</div>}<div ref={bottomRef}/></div><form onSubmit={(event) => { event.preventDefault(); void generate(input, true); }} className="flex items-center gap-2 border-t border-[#e9ede6] bg-white p-4"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask to refine: shorter, warmer, add a source…" className="h-11 min-w-0 flex-1 rounded-xl border border-[#e2e7e0] bg-[#fafbf9] px-3 text-sm outline-none focus:border-[#b0c35e]"/><button disabled={busy || !input.trim()} aria-label="Send refinement" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#1e2e27] text-white disabled:opacity-40"><ArrowUp size={18}/></button></form></>}
      </section>

      <aside className="space-y-4"><section className="rounded-2xl border border-[#e0e6df] bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Globe2 size={15} className="text-[#81984b]"/><h2 className="text-sm font-bold">Research & SEO</h2></div><p className="mt-1 text-[11px] leading-5 text-[#929e95]">Signals are estimates; live trend feeds are not connected.</p><div className="mt-5"><div className="flex items-center justify-between"><h3 className="text-xs font-bold">Topic keywords</h3><span className="text-[10px] text-[#a2aca4]">Text analysis</span></div><div className="mt-2 space-y-2">{allKeywords.length ? allKeywords.slice(0, 6).map((keyword, index) => <div key={keyword} className="flex items-center justify-between rounded-lg bg-[#f7f9f5] px-3 py-2"><span className="text-xs font-medium">{keyword}</span><span className="text-[10px] text-[#99a59b]">{Math.max(42, 94 - index * 9)}% relevance</span></div>) : <p className="rounded-lg bg-[#f7f9f5] px-3 py-3 text-[11px] text-[#9aa59d]">Generate a draft to analyze its topic.</p>}</div></div><div className="mt-5 border-t border-[#edf0eb] pt-4"><h3 className="text-xs font-bold">Hashtag ideas</h3><div className="mt-2 flex flex-wrap gap-1.5">{tags.length ? tags.map((tag) => <span key={tag} className="rounded-full bg-[#edf3df] px-2.5 py-1 text-[10px] font-semibold text-[#697d3a]">{tag}</span>) : <p className="text-[11px] text-[#9aa59d]">Generated from topic keywords.</p>}</div></div><div className="mt-5 border-t border-[#edf0eb] pt-4"><div className="flex items-center justify-between"><h3 className="text-xs font-bold">Readability review</h3><span className="text-[10px] text-[#99a59b]">Heuristic</span></div><p className="mt-2 text-[11px] leading-5 text-[#89968e]">Review the draft for clarity, audience fit, and platform length before you publish.</p></div><div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3"><div className="flex items-center gap-2 text-xs font-bold text-amber-800"><FileText size={14}/> Fact check required</div><p className="mt-1 text-[11px] leading-5 text-amber-800/80">No automatic fact-checking is connected. Sources, when available, are linked in the chat.</p></div></section><section className="rounded-2xl border border-[#e0e6df] bg-white p-5 shadow-sm"><h2 className="text-sm font-bold">Thread history</h2><p className="mt-1 text-[11px] text-[#95a097]">Saved in this browser</p><div className="mt-3 space-y-2">{savedThreads.length ? savedThreads.map((thread) => <button key={thread.id} onClick={() => { setMessages(thread.messages); setError(""); }} className="w-full truncate rounded-lg bg-[#f6f8f3] px-3 py-2.5 text-left text-xs font-medium text-[#637157]">{thread.title}</button>) : <p className="rounded-lg bg-[#f6f8f3] px-3 py-3 text-[11px] text-[#9aa59d]">Save a draft to keep it in this browser.</p>}</div></section></aside>
    </div>
  </div>;
}

const selectClass = "mt-1 h-10 w-full min-w-0 rounded-xl border border-[#e1e7df] bg-[#fbfcfa] px-3 text-xs text-[#35433b] outline-none focus:border-[#b0c35e]";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mt-3 block text-xs font-semibold text-[#65736a]">{label}{children}</label>; }
