"use client";

import { FormEvent, useState } from "react";
import { Check, Clipboard, LoaderCircle, Sparkles } from "lucide-react";

import { analyzeProfile, type OptimizationAnalysis } from "@/lib/optimization-api";

const initialProfile = {
  headline: "Product strategist helping teams turn ambiguous growth problems into clear systems",
  about: "I help product and growth teams make better decisions through thoughtful research, clear positioning, and repeatable operating rhythms.",
  targetRole: "Product strategy leader",
  skills: "product strategy, positioning, growth systems, user research",
  keywords: "product strategy, product-led growth, positioning, growth systems",
};

const initialCompetitor = {
  label: "High-signal profile",
  headline: "Product strategy and growth systems for teams scaling with intent",
  about: "I work with ambitious teams on product-led growth, category design, and the operating systems that turn insight into momentum.",
  skills: "product strategy, product-led growth, category design, operating systems",
};

export function ProfileLab() {
  const [profile, setProfile] = useState(initialProfile);
  const [competitor, setCompetitor] = useState(initialCompetitor);
  const [analysis, setAnalysis] = useState<OptimizationAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  async function submitAnalysis(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeProfile({
        profile: {
          headline: profile.headline,
          about: profile.about,
          target_role: profile.targetRole,
          skills: splitList(profile.skills),
        },
        competitors: [{
          label: competitor.label,
          headline: competitor.headline,
          about: competitor.about,
          skills: splitList(competitor.skills),
        }],
        target_keywords: splitList(profile.keywords),
      });
      setAnalysis(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The analysis could not be completed");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function copySuggestion(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedText(value);
      window.setTimeout(() => setCopiedText(null), 1600);
    } catch {
      setCopiedText(null);
    }
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 text-sm font-semibold text-[#5a6f28]">Human-in-the-loop workspace</p>
        <h1 className="text-3xl font-bold tracking-[-0.06em] sm:text-4xl">Profile lab<span className="text-[#b7cc5b]">.</span></h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5d6d64]">Compare your evidence with a reference profile and decide which improvements are true for you before anything is published.</p>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-[#dfe9d0] bg-[#f5f9e9] px-3 py-2 text-xs font-semibold text-[#66783b]"><Sparkles size={14} /> Nothing is auto-published</div>
    </div>

    <form onSubmit={submitAnalysis} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="rounded-2xl border border-[#e0e6df] bg-[#fbfcf9] p-5 shadow-[0_12px_40px_rgba(39,59,52,0.04)] sm:p-6" aria-labelledby="your-profile-heading">
        <div><h2 id="your-profile-heading" className="text-base font-bold">Your profile evidence</h2><p className="mt-1 text-xs leading-5 text-[#63716a]">Use facts you can stand behind. The analyst only uses this text to draft reviewable suggestions.</p></div>
        <div className="mt-5 space-y-4">
          <Field label="Current headline" value={profile.headline} onChange={(headline) => setProfile({ ...profile, headline })} maxLength={300} />
          <TextArea label="About" value={profile.about} onChange={(about) => setProfile({ ...profile, about })} maxLength={5000} rows={5} />
          <Field label="Target role" value={profile.targetRole} onChange={(targetRole) => setProfile({ ...profile, targetRole })} maxLength={160} />
          <Field label="Skills (comma separated)" value={profile.skills} onChange={(skills) => setProfile({ ...profile, skills })} />
          <Field label="Target keywords (comma separated)" value={profile.keywords} onChange={(keywords) => setProfile({ ...profile, keywords })} required />
        </div>
      </section>

      <section className="rounded-2xl border border-[#e0e6df] bg-[#fbfcf9] p-5 shadow-[0_12px_40px_rgba(39,59,52,0.04)] sm:p-6" aria-labelledby="reference-profile-heading">
        <div><h2 id="reference-profile-heading" className="text-base font-bold">Reference profile</h2><p className="mt-1 text-xs leading-5 text-[#63716a]">Provide one public, high-signal comparison. Do not include private messages, cookies, or credentials.</p></div>
        <div className="mt-5 space-y-4">
          <Field label="Reference label" value={competitor.label} onChange={(label) => setCompetitor({ ...competitor, label })} maxLength={120} required />
          <Field label="Reference headline" value={competitor.headline} onChange={(headline) => setCompetitor({ ...competitor, headline })} maxLength={300} />
          <TextArea label="Reference About" value={competitor.about} onChange={(about) => setCompetitor({ ...competitor, about })} maxLength={5000} rows={5} />
          <Field label="Reference skills (comma separated)" value={competitor.skills} onChange={(skills) => setCompetitor({ ...competitor, skills })} />
        </div>
        <button type="submit" disabled={isAnalyzing} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#17221f] px-4 text-sm font-bold text-[#e8ff70] transition-colors hover:bg-[#273b34] disabled:cursor-wait disabled:opacity-70">{isAnalyzing ? <><LoaderCircle className="animate-spin" size={16} /> Reviewing evidence…</> : <><Sparkles size={16} /> Analyze gaps</>}</button>
      </section>
    </form>

    {error && <div role="alert" className="rounded-2xl border border-[#f0d4cf] bg-[#fff8f6] px-5 py-4 text-sm text-[#9d5b50]"><strong className="font-bold">Analysis unavailable.</strong> {error} Start the FastAPI service and configure GROQ_API_KEY before trying again.</div>}
    {analysis && <AnalysisResults analysis={analysis} copiedText={copiedText} onCopy={copySuggestion} />}
  </div>;
}

function AnalysisResults({ analysis, copiedText, onCopy }: { analysis: OptimizationAnalysis; copiedText: string | null; onCopy: (value: string) => Promise<void> }) {
  return <section className="space-y-6" aria-labelledby="analysis-heading">
    <div className="rounded-2xl border border-[#dfe9d0] bg-[#f7faee] p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b9b51]">Review queue</p><h2 id="analysis-heading" className="mt-2 text-xl font-bold tracking-[-0.04em]">Your profile has a {Math.round(analysis.profile_score)}/100 evidence score</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-[#59675f]">{analysis.summary}</p></div><div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-8 border-[#dce8b8] bg-white text-2xl font-bold text-[#607536]">{Math.round(analysis.profile_score)}</div></div></div>
    <div className="grid gap-6 xl:grid-cols-2">
      <ResultCard title="Keyword gaps"><div className="space-y-3">{analysis.keyword_gaps.length === 0 ? <p className="text-sm text-[#89968e]">No material gaps were returned.</p> : analysis.keyword_gaps.map((gap) => <div key={gap.keyword} className="rounded-xl border border-[#e7ece4] bg-[#fbfcf9] p-4"><div className="flex items-center justify-between gap-3"><span className="font-bold text-[#304038]">{gap.keyword}</span><span className="rounded-full bg-[#edf4d7] px-2 py-1 text-[10px] font-bold text-[#657b36]">{Math.round(gap.gap_score)} gap</span></div><p className="mt-2 text-xs leading-5 text-[#78867d]">{gap.recommendation}</p><p className="mt-2 text-[11px] text-[#9aa69e]">Evidence: {gap.user_evidence || "Not present in submitted profile"}</p></div>)}</div></ResultCard>
      <ResultCard title="Headline suggestions"><SuggestionList values={analysis.headline_suggestions} copiedText={copiedText} onCopy={onCopy} /></ResultCard>
      <ResultCard title="About recommendations"><SuggestionList values={analysis.about_recommendations} copiedText={copiedText} onCopy={onCopy} /></ResultCard>
      <ResultCard title="Human review checklist"><ul className="space-y-3">{analysis.human_review_actions.map((action) => <li key={action} className="flex gap-3 text-sm leading-6 text-[#59675f]"><span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#edf4d7] text-[#6e863a]"><Check size={13} /></span>{action}</li>)}</ul></ResultCard>
    </div>
    <p className="text-xs text-[#98a59c]">Generated {new Date(analysis.generated_at).toLocaleString()} using {analysis.model || "the configured analysis engine"}. Treat every suggestion as a draft for human review.</p>
  </section>;
}

function SuggestionList({ values, copiedText, onCopy }: { values: string[]; copiedText: string | null; onCopy: (value: string) => Promise<void> }) {
  return <div className="space-y-3">{values.map((value) => <div key={value} className="rounded-xl border border-[#e7ece4] bg-[#fbfcf9] p-4"><div className="flex items-start gap-3"><p className="flex-1 text-sm leading-6 text-[#59675f]">{value}</p><button type="button" className="shrink-0 rounded-lg p-2 text-[#7f9450] hover:bg-[#edf2e9]" onClick={() => void onCopy(value)} aria-label="Copy suggestion">{copiedText === value ? <Check size={16} /> : <Clipboard size={16} />}</button></div></div>)}</div>;
}

function ResultCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <article className="rounded-2xl border border-[#e0e6df] bg-[#fbfcf9] p-5 sm:p-6"><h3 className="text-base font-bold">{title}</h3><div className="mt-4">{children}</div></article>;
}

function Field({ label, value, onChange, maxLength, required = false }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number; required?: boolean }) {
  return <label className="block text-xs font-bold text-[#627168]">{label}<input required={required} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#e0e6df] bg-white px-3 text-sm font-normal text-[#26342d] outline-none placeholder:text-[#a2ada5] focus:border-[#aabd62]" /></label>;
}

function TextArea({ label, value, onChange, maxLength, rows }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number; rows: number }) {
  return <label className="block text-xs font-bold text-[#627168]">{label}<textarea required maxLength={maxLength} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full resize-y rounded-xl border border-[#e0e6df] bg-white px-3 py-3 text-sm font-normal leading-6 text-[#26342d] outline-none placeholder:text-[#a2ada5] focus:border-[#aabd62]" /></label>;
}

function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
