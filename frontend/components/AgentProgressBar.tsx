'use client'

import { useEffect, useState } from 'react'
import type { Mode } from '@/lib/api'
import { THEMES } from '@/lib/themes'

interface Props {
  currentAgent: string
  mode: Mode
}

// Step names per mode — shown in order as the flow runs
const STEPS: Record<Mode, string[]> = {
  kids:       ['STEM Sentinel', 'Wonder Narrator', 'Wonder Curator', 'Quiz Elf', 'Journey Mapper', 'Art Whisperer'],
  college:    ['STEM Sentinel', 'The Scholar', 'Wonder Weaver', 'The Examiner', 'Curriculum Designer', 'Diagram Director'],
  researcher: ['STEM Sentinel', 'Research Analyst', 'Frontier Scout', 'Peer Reviewer', 'Grant Strategist', 'Data Cartographer'],
}

export default function AgentProgressBar({ currentAgent, mode }: Props) {
  const [angle, setAngle] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const theme = THEMES[mode]
  const steps = STEPS[mode]

  // Spinning star animation
  useEffect(() => {
    const id = setInterval(() => setAngle((a) => (a + 3) % 360), 30)
    return () => clearInterval(id)
  }, [])

  // Elapsed timer
  useEffect(() => {
    setElapsed(0)
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Derive which step we're on from the agent name string
  const currentStep = steps.findIndex((s) =>
    currentAgent.toLowerCase().includes(s.toLowerCase())
  )
  const stepIndex = currentStep >= 0 ? currentStep : 0
  const progressPct = Math.round(((stepIndex + 1) / steps.length) * 100)

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const elapsedStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`

  return (
    <div style={{
      marginTop: '1.5rem',
      background: 'var(--surface)',
      border: `1px solid ${theme.accent}`,
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {/* Top row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 1.25rem',
      }}>
        {/* Spinning star */}
        <svg
          width="34"
          height="34"
          viewBox="0 0 36 36"
          style={{ transform: `rotate(${angle}deg)`, flexShrink: 0 }}
        >
          <polygon
            points="18,2 21,12 31,9 24,17 31,26 21,23 18,33 15,23 5,26 12,17 5,9 15,12"
            fill={theme.accent}
            opacity="0.85"
          />
          <circle cx="18" cy="18" r="4" fill="var(--bg)" />
        </svg>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.1rem' }}>
            Running agent · {elapsedStr}
          </div>
          <div style={{
            color: theme.accent,
            fontWeight: 600,
            fontSize: '0.92rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}>
            {currentAgent || 'Initializing…'}
          </div>
        </div>

        <span style={{
          fontSize: '0.78rem',
          color: 'var(--muted)',
          flexShrink: 0,
          background: 'var(--surface-2)',
          padding: '0.15rem 0.5rem',
          borderRadius: '10px',
          border: '1px solid var(--border)',
        }}>
          {stepIndex + 1}/{steps.length}
        </span>
      </div>

      {/* Step progress bar */}
      <div style={{ height: '3px', background: 'var(--surface-2)' }}>
        <div style={{
          height: '100%',
          width: `${progressPct}%`,
          background: theme.accent,
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Step pills */}
      <div style={{
        display: 'flex',
        gap: '0.35rem',
        padding: '0.6rem 1.25rem',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {steps.map((step, i) => {
          const isPast    = i < stepIndex
          const isCurrent = i === stepIndex
          return (
            <span
              key={step}
              style={{
                fontSize: '0.72rem',
                padding: '0.15rem 0.55rem',
                borderRadius: '10px',
                border: `1px solid ${isCurrent ? theme.accent : isPast ? theme.accent : 'var(--border)'}`,
                background: isCurrent ? theme.bg : isPast ? 'transparent' : 'transparent',
                color: isCurrent ? theme.accent : isPast ? theme.accent : 'var(--muted)',
                opacity: isPast ? 0.5 : 1,
                whiteSpace: 'nowrap',
                fontWeight: isCurrent ? 600 : 400,
                flexShrink: 0,
              }}
            >
              {isPast ? '✓ ' : ''}{step}
            </span>
          )
        })}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
