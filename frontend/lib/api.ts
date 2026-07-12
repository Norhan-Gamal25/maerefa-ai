export type Mode = 'kids' | 'college' | 'researcher'

export interface WonderCard {
  emoji: string
  fact: string
}

export interface QuizQuestion {
  question: string
  type: 'mcq' | 'calculation' | 'open-ended'
  options: string[]
  correct: string
  explanation: string
}

export interface MaerefaResult {
  mode: Mode
  explanation: Record<string, unknown>
  wonder_cards: WonderCard[]
  quiz: { questions: QuizQuestion[] }
  image_url: string | null
  agent_trace: string[]
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function submitPrompt(
  prompt: string,
  mode: Mode
): Promise<{ task_id: string }> {
  const res = await fetch(`${BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, mode }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function pollStatus(
  taskId: string,
  onAgentUpdate?: (agent: string) => void,
  signal?: AbortSignal
): Promise<{ result: MaerefaResult | null; error: string | null }> {
  const POLL_INTERVAL_MS = 2000  // poll every 2s
  const MAX_POLLS = 60            // 120s max (2s × 60 = 120s)
  for (let i = 0; i < MAX_POLLS; i++) {
    // Honour cancellation before each sleep and before each fetch
    if (signal?.aborted) return { result: null, error: 'cancelled' }
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, POLL_INTERVAL_MS)
      signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')) }, { once: true })
    }).catch(() => null)
    if (signal?.aborted) return { result: null, error: 'cancelled' }
    let res: Response
    try {
      res = await fetch(`${BASE}/api/status/${taskId}`, { signal })
    } catch {
      // network blip or abort — retry silently (abort exits on next iteration check)
      continue
    }
    if (!res.ok) continue
    let data: Record<string, unknown>
    try {
      data = await res.json()
    } catch {
      continue
    }
    if (data.current_agent && onAgentUpdate) {
      onAgentUpdate(data.current_agent as string)
    }
    if (data.status === 'done' || data.status === 'error') {
      return { result: (data.result as MaerefaResult) ?? null, error: (data.error as string) ?? null }
    }
  }
  return { result: null, error: 'Request timed out after 2 minutes. The backend may be overloaded — please try again.' }
}
