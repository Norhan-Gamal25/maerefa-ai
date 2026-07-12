'use client'

import { useState } from 'react'
import type { QuizQuestion, Mode } from '@/lib/api'
import { THEMES } from '@/lib/themes'
import { MixedText } from '@/lib/renderLatex'

interface Props {
  questions: QuizQuestion[]
  mode: Mode
  onNewPrompt?: (prompt: string) => void
}

export default function QuizPanel({ questions, mode, onNewPrompt }: Props) {
  const theme = THEMES[mode]
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const safeQuestions = questions ?? []
  const q = safeQuestions[index]

  if (!safeQuestions.length || !q) return null

  const isMCQ = q.type === 'mcq'
  const isCalculation = q.type === 'calculation'
  const isOpen = q.type === 'open-ended'

  // "answered" means the user has committed to a response and can move on
  const answered = isMCQ ? selected !== null : isCalculation ? revealed : true

  const handleSelect = (opt: string) => {
    if (selected) return
    const letter = opt.charAt(0)
    setSelected(letter)
    if (letter === q.correct) setScore((s) => s + 1)
  }

  const next = () => {
    if (index + 1 >= safeQuestions.length) {
      setDone(true)
      return
    }
    setIndex((i) => i + 1)
    setSelected(null)
    setRevealed(false)
  }

  const mcqCount = safeQuestions.filter((q) => q.type === 'mcq').length
  const scoreLabel = mcqCount > 0 ? `${score} / ${mcqCount}` : '—'

  const encouragement = () => {
    if (mcqCount === 0) return '✅ Review complete!'
    const pct = (score / mcqCount) * 100
    if (pct === 100) return '🏆 Perfect! Absolutely brilliant!'
    if (pct >= 80) return '⭐ Excellent work!'
    if (pct >= 60) return '✅ Good effort — keep exploring!'
    return '💪 Keep learning — every question teaches you something!'
  }

  if (done) {
    return (
      <div className="card" style={{ textAlign: 'center', borderColor: theme.accent }}>
        <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{encouragement()}</div>
        {mcqCount > 0 && (
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: theme.accent, marginBottom: '1rem' }}>
            {scoreLabel}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost"
            onClick={() => { setDone(false); setIndex(0); setSelected(null); setRevealed(false); setScore(0) }}
            style={{ borderColor: theme.accent, color: theme.accent }}
          >
            ↺ Retry Quiz
          </button>
        </div>
      </div>
    )
  }

  const isLastQ = index + 1 >= safeQuestions.length
  const nextLabel = isLastQ ? 'Finish →' : 'Next →'

  return (
    <div className="card" style={{ borderColor: theme.accent }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', color: theme.accent, fontWeight: 600 }}>
          ❓ Quiz
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {mcqCount > 0 && (
            <span style={{
              fontSize: '0.78rem',
              background: 'var(--surface-2)',
              border: `1px solid ${theme.accent}`,
              borderRadius: '10px',
              padding: '0.15rem 0.6rem',
              color: theme.accent,
              fontWeight: 600,
            }}>
              {score} pts
            </span>
          )}
          <span style={{
            fontSize: '0.75rem',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '0.15rem 0.55rem',
            color: 'var(--muted)',
          }}>
            {index + 1} / {safeQuestions.length}
          </span>
          <span style={{
            fontSize: '0.75rem',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '0.15rem 0.55rem',
            color: 'var(--muted)',
          }}>
            {isMCQ ? 'MCQ' : isCalculation ? 'Calculation' : 'Open-ended'}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'var(--surface-2)', borderRadius: '2px', marginBottom: '1.25rem' }}>
        <div style={{
          height: '100%',
          width: `${((index + 1) / safeQuestions.length) * 100}%`,
          background: theme.accent,
          borderRadius: '2px',
          transition: 'width 0.3s',
        }} />
      </div>

      <p dir="auto" style={{ fontWeight: 500, marginBottom: '1.1rem', lineHeight: 1.65, fontSize: '0.97rem' }}>
        <MixedText text={q.question} />
      </p>

      {/* ── MCQ options ────────────────────────────────────────────────────── */}
      {isMCQ && Array.isArray(q.options) && q.options.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {q.options.map((opt) => {
            const letter = opt.charAt(0)
            const isCorrect = selected !== null && letter === q.correct
            const isWrong = selected === letter && letter !== q.correct
            return (
              <button
                key={letter}
                onClick={() => handleSelect(opt)}
                style={{
                  textAlign: 'left',
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  border: `1px solid ${isCorrect ? '#22c55e' : isWrong ? '#ef4444' : 'var(--border)'}`,
                  background: isCorrect ? 'rgba(34,197,94,0.1)' : isWrong ? 'rgba(239,68,68,0.1)' : 'var(--surface-2)',
                  color: 'var(--text)',
                  cursor: selected ? 'default' : 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                <span dir="auto"><MixedText text={opt} /></span>
              </button>
            )
          })}
        </div>
      )}

      {/* MCQ explanation after selection */}
      {isMCQ && selected && q.explanation && (
        <div dir="auto" style={{
          background: 'var(--surface-2)',
          borderLeft: `3px solid ${theme.accent}`,
          padding: '0.75rem',
          borderRadius: '0 8px 8px 0',
          marginBottom: '1rem',
          fontSize: '0.88rem',
          lineHeight: 1.65,
        }}>
          <MixedText text={q.explanation} />
        </div>
      )}

      {/* ── Calculation — reveal solution ──────────────────────────────────── */}
      {isCalculation && (
        <div style={{ marginBottom: '1rem' }}>
          {!revealed ? (
            <button
              className="btn btn-ghost"
              onClick={() => setRevealed(true)}
              style={{ borderColor: theme.accent, color: theme.accent }}
            >
              Show Solution →
            </button>
          ) : (
            <div dir="auto" style={{
              background: 'var(--surface-2)',
              borderLeft: `3px solid ${theme.accent}`,
              padding: '0.75rem',
              borderRadius: '0 8px 8px 0',
              fontSize: '0.9rem',
              lineHeight: 1.65,
            }}>
              <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: theme.accent }}>
                Answer: <MixedText text={q.correct} />
              </div>
              <MixedText text={q.explanation} />
            </div>
          )}
        </div>
      )}

      {/* ── Open-ended — always show model answer inline ───────────────────── */}
      {isOpen && (
        <div dir="auto" style={{
          background: 'var(--surface-2)',
          borderLeft: `3px solid ${theme.accent}`,
          padding: '0.75rem',
          borderRadius: '0 8px 8px 0',
          marginBottom: '1rem',
          fontSize: '0.88rem',
          lineHeight: 1.65,
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: theme.accent, fontSize: '0.8rem' }}>
            MODEL ANSWER
          </div>
          <div style={{ marginBottom: '0.5rem' }}><MixedText text={q.correct} /></div>
          {q.explanation && q.explanation !== q.correct && (
            <>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--muted)', fontSize: '0.75rem' }}>
                WHY IT MATTERS
              </div>
              <div style={{ color: 'var(--muted)' }}><MixedText text={q.explanation} /></div>
            </>
          )}
        </div>
      )}

      {/* Next / Finish button — shown once the question is "answered" */}
      {answered && (
        <button
          className="btn btn-ghost"
          onClick={next}
          style={{ borderColor: theme.accent, color: theme.accent }}
        >
          {nextLabel}
        </button>
      )}
    </div>
  )
}
