import type {
  Tier,
  TopicModuleDetail,
  TraceResult,
  VerifyResult,
  GotchaItem,
  GotchaCheckResult,
  OverallProgress
} from './types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function fetchCurriculum(): Promise<{ tiers: Tier[] }> {
  const res = await fetch(`${BASE_URL}/api/curriculum`);
  if (!res.ok) throw new Error(`Failed to fetch curriculum: ${res.statusText}`);
  return res.json();
}

export async function fetchModule(slug: string): Promise<TopicModuleDetail> {
  const res = await fetch(`${BASE_URL}/api/curriculum/${slug}`);
  if (!res.ok) throw new Error(`Failed to fetch module ${slug}: ${res.statusText}`);
  return res.json();
}

export async function executeTrace(code: string): Promise<TraceResult> {
  const res = await fetch(`${BASE_URL}/api/execute/trace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  if (!res.ok) throw new Error(`Failed to execute trace: ${res.statusText}`);
  return res.json();
}

export async function verifySolution(slug: string, code: string): Promise<VerifyResult> {
  const res = await fetch(`${BASE_URL}/api/execute/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, code })
  });
  if (!res.ok) throw new Error(`Verification request failed: ${res.statusText}`);
  return res.json();
}

export async function fetchGotchas(): Promise<{ gotchas: GotchaItem[] }> {
  const res = await fetch(`${BASE_URL}/api/gotchas`);
  if (!res.ok) throw new Error(`Failed to fetch gotchas: ${res.statusText}`);
  return res.json();
}

export async function checkGotcha(id: string, selected_option: string): Promise<GotchaCheckResult> {
  const res = await fetch(`${BASE_URL}/api/gotchas/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, selected_option })
  });
  if (!res.ok) throw new Error(`Failed to check gotcha: ${res.statusText}`);
  return res.json();
}

export async function fetchOverallProgress(): Promise<OverallProgress> {
  const res = await fetch(`${BASE_URL}/api/progress`);
  if (!res.ok) throw new Error(`Failed to fetch progress: ${res.statusText}`);
  return res.json();
}

export async function saveProgress(slug: string, user_notes?: string, saved_code?: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/api/progress/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, user_notes, saved_code })
  });
  if (!res.ok) throw new Error(`Failed to save progress: ${res.statusText}`);
  return res.json();
}

export async function fetchSnippets(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/snippets`);
  if (!res.ok) throw new Error(`Failed to fetch snippets: ${res.statusText}`);
  return res.json();
}

export async function saveSnippet(title: string, code: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/snippets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, code })
  });
  if (!res.ok) throw new Error(`Failed to save snippet: ${res.statusText}`);
  return res.json();
}

export async function fetchLeetCodeProblems(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/leetcode`);
  if (!res.ok) throw new Error(`Failed to fetch LeetCode problems: ${res.statusText}`);
  return res.json();
}

export async function fetchLeetCodeProblem(slug: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/leetcode/${slug}`);
  if (!res.ok) throw new Error(`Failed to fetch LeetCode problem ${slug}: ${res.statusText}`);
  return res.json();
}

export async function verifyLeetCodeSolution(slug: string, code: string): Promise<VerifyResult> {
  const res = await fetch(`${BASE_URL}/api/leetcode/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, code })
  });
  if (!res.ok) throw new Error(`Failed to verify LeetCode solution: ${res.statusText}`);
  return res.json();
}

