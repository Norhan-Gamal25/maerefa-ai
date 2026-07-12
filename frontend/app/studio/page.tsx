'use client'

import { Suspense, useCallback, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ModeSelector from '@/components/ModeSelector'
import PromptInput from '@/components/PromptInput'
import AgentProgressBar from '@/components/AgentProgressBar'
import ExplanationPanel from '@/components/ExplanationPanel'
import WonderCards from '@/components/WonderCards'
import QuizPanel from '@/components/QuizPanel'
import VisualCanvas from '@/components/VisualCanvas'
import AlgoVisualizer from '@/components/AlgoVisualizer'
import ConceptVisualizer from '@/components/ConceptVisualizer'
import { submitPrompt, pollStatus } from '@/lib/api'
import { checkGoldenPath } from '@/lib/golden_path'
import { detectAllAlgos, VIZ_CATEGORY } from '@/lib/algoDetector'
import type { MaerefaResult, Mode } from '@/lib/api'

// ─── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton" style={{
          height: '14px',
          marginBottom: i < lines - 1 ? '0.6rem' : 0,
          width: i === lines - 1 ? '60%' : '100%',
        }} />
      ))}
    </div>
  )
}

// ─── Multi-algo visualizer block ───────────────────────────────────────────────
// Detects ALL algorithms in the prompt (fixes the 2-algo cap) and renders:
//   • A single tabbed AlgoVisualizer for all CS algorithm types
//   • Individual ConceptVisualizer panels for physics / math / chemistry types

function MultiVisualizer({ prompt, mode }: { prompt: string; mode: Mode }) {
  const allTypes = detectAllAlgos(prompt)
  if (!allTypes.length) return null

  const algoTypes = allTypes.filter(t => VIZ_CATEGORY[t] === 'algo')
  const conceptTypes = allTypes.filter(t => VIZ_CATEGORY[t] !== 'algo')

  return (
    <>
      {algoTypes.length > 0 && (
        <AlgoVisualizer
          algoType={algoTypes[0]}
          algoTypes={algoTypes}        // all algo tabs passed here
          mode={mode}
        />
      )}
      {conceptTypes.map(t => (
        <ConceptVisualizer key={t} algoType={t} mode={mode} />
      ))}
    </>
  )
}

// ─── Studio ────────────────────────────────────────────────────────────────────

function StudioContent() {
  const searchParams = useSearchParams()
  const initialMode = (searchParams.get('mode') as Mode) || 'college'

  const [mode, setMode] = useState<Mode>(initialMode)
  const [loading, setLoading] = useState(false)
  const [currentAgent, setCurrentAgent] = useState('')
  const [result, setResult] = useState<MaerefaResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastPrompt, setLastPrompt] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
    setCurrentAgent('')
  }, [])

  const handleModeChange = useCallback((m: Mode) => {
    abortRef.current?.abort()
    abortRef.current = null
    setMode(m)
    setResult(null)
    setError(null)
    setLastPrompt('')
    setCurrentAgent('')
  }, [])

  const handleSubmit = useCallback(async (prompt: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setResult(null)
    setError(null)
    setLastPrompt(prompt)
    setCurrentAgent('STEM Sentinel')

    const cached = checkGoldenPath(prompt, mode)
    if (cached) {
      setResult(cached)
      setLoading(false)
      setCurrentAgent('')
      abortRef.current = null
      return
    }

    try {
      const { task_id } = await submitPrompt(prompt, mode)
      const finalResult = await pollStatus(task_id, (agent) => setCurrentAgent(agent), controller.signal)
      if (controller.signal.aborted) return
      if (finalResult.error && !finalResult.result) {
        setError(finalResult.error)
      } else {
        setResult(finalResult.result as MaerefaResult)
      }
    } catch {
      if (!controller.signal.aborted) {
        setError('Failed to connect to Maerefa AI backend. Is it running?')
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
        setCurrentAgent('')
        abortRef.current = null
      }
    }
  }, [mode])

  return (
    <div className={`mode-${mode}`} style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0.9rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--surface)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <a href="/" style={{ fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="22" height="22" viewBox="0 0 80 80">
            <polygon points="40,5 50,22 68,22 55,33 60,51 40,40 20,51 25,33 12,22 30,22" fill="none" stroke="#6366f1" strokeWidth="1.5"/>
            <circle cx="40" cy="40" r="5" fill="#6366f1" opacity="0.9"/>
          </svg>
          Maerefa
        </a>
        <ModeSelector mode={mode} onChange={handleModeChange} />
      </header>

      <div className="container" style={{ padding: '2rem 1.5rem', paddingBottom: '4rem' }}>
        {/* Prompt input */}
        <PromptInput onSubmit={handleSubmit} onStop={handleStop} loading={loading} mode={mode} />

        {/* Loading */}
        {loading && (
          <>
            <AgentProgressBar currentAgent={currentAgent} mode={mode} />
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <SkeletonCard lines={4} />
              <SkeletonCard lines={3} />
              <SkeletonCard lines={5} />
            </div>
          </>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            color: '#fca5a5',
            marginTop: '1.5rem',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}>
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* 1. Multi-algo/concept visualizer — unlimited algorithms, tab switcher */}
            <MultiVisualizer prompt={lastPrompt} mode={mode} />

            {/* 2. AI-generated image */}
            {result.image_url && <VisualCanvas imageUrl={result.image_url} mode={mode} />}

            {/* 3. Explanation */}
            {result.explanation && Object.keys(result.explanation).length > 0 && (
              <ExplanationPanel explanation={result.explanation} mode={mode} />
            )}

            {/* 4. Wonder cards */}
            {Array.isArray(result.wonder_cards) && result.wonder_cards.length > 0 && (
              <WonderCards cards={result.wonder_cards} mode={mode} />
            )}

            {/* 5. Quiz */}
            {result.quiz?.questions?.length > 0 && (
              <QuizPanel questions={result.quiz.questions} mode={mode} onNewPrompt={handleSubmit} />
            )}

            {/* 7. Agent trace */}
            {result.agent_trace?.length > 0 && (
              <div>
                <div className="section-label">Generated by</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {result.agent_trace.map((a) => (
                    <span key={a} style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '20px',
                      padding: '0.2rem 0.7rem',
                      fontSize: '0.75rem',
                      color: 'var(--muted)',
                    }}>
                      ✓ {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: 'var(--muted)' }}>Loading…</div>}>
      <StudioContent />
    </Suspense>
  )
}
