export interface AnalyzeRequest {
  profile: {
    headline: string;
    about: string;
    skills: string[];
    target_role: string;
  };
  competitors: Array<{
    label: string;
    headline: string;
    about: string;
    skills: string[];
    engagement_score?: number;
  }>;
  target_keywords: string[];
}

export interface KeywordGap {
  keyword: string;
  user_evidence: string;
  competitor_frequency: number;
  gap_score: number;
  recommendation: string;
}

export interface OptimizationAnalysis {
  summary: string;
  profile_score: number;
  keyword_gaps: KeywordGap[];
  headline_suggestions: string[];
  about_recommendations: string[];
  human_review_actions: string[];
  generated_at: string;
  model: string;
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export async function analyzeProfile(payload: AnalyzeRequest): Promise<OptimizationAnalysis> {
  const response = await fetch(`${apiBaseUrl}/optimization/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as
    | OptimizationAnalysis
    | { error?: { message?: string } }
    | null;

  if (!response.ok) {
    throw new Error(body && "error" in body ? body.error?.message ?? "Analysis failed" : "Analysis failed");
  }

  return body as OptimizationAnalysis;
}
