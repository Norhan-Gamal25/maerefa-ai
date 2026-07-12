'use client'

import { useState, useRef } from 'react'
import type { Mode } from '@/lib/api'
import { THEMES } from '@/lib/themes'
import DomainSelector from './DomainSelector'

interface Props {
  onSubmit: (prompt: string) => void
  onStop: () => void
  loading: boolean
  mode: Mode
}

const PLACEHOLDERS: Record<Mode, string> = {
  kids: 'Ask about fractals, rainbows, prime numbers…',
  college: 'Explain quantum entanglement, Maxwell equations…',
  researcher: 'Open problems in prime number theory…',
}

export default function PromptInput({ onSubmit, onStop, loading, mode }: Props) {
  const [value, setValue] = useState('')
  const [domainHint, setDomainHint] = useState('')
  const theme = THEMES[mode]
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const prompt = value.trim()
    if (!prompt || prompt.length < 3 || loading) return
    const full = domainHint ? `${prompt} [domain: ${domainHint}]` : prompt
    onSubmit(full)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <DomainSelector onSelect={setDomainHint} mode={mode} />
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        background: 'var(--surface)',
        border: `1px solid ${value ? theme.accent : 'var(--border)'}`,
        borderRadius: '12px',
        padding: '0.75rem 1rem',
        transition: 'border-color 0.2s',
      }}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder={PLACEHOLDERS[mode]}
          rows={2}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text)',
            fontSize: '1rem',
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.6,
          }}
        />
        {loading ? (
          <button
            onClick={onStop}
            style={{
              alignSelf: 'flex-end',
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.5)',
              borderRadius: '8px',
              padding: '0.55rem 1rem',
              color: '#fca5a5',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'background 0.2s',
            }}
          >
            ✕ Stop
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || value.trim().length < 3}
            style={{
              alignSelf: 'flex-end',
              background: theme.accent,
              border: 'none',
              borderRadius: '8px',
              padding: '0.55rem 1rem',
              color: '#000',
              fontWeight: 700,
              cursor: (!value.trim() || value.trim().length < 3) ? 'not-allowed' : 'pointer',
              opacity: (!value.trim() || value.trim().length < 3) ? 0.5 : 1,
              transition: 'opacity 0.2s',
              fontSize: '0.9rem',
            }}
          >
            →
          </button>
        )}
      </div>
    </div>
  )
}
