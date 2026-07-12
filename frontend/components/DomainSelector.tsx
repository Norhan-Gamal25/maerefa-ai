'use client'

import { useState } from 'react'
import type { Mode } from '@/lib/api'
import { THEMES } from '@/lib/themes'

const DOMAINS = ['Mathematics', 'Physics', 'Chemistry', 'Computer Science']

interface Props {
  onSelect: (domain: string) => void
  mode: Mode
}

export default function DomainSelector({ onSelect, mode }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const theme = THEMES[mode]

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {DOMAINS.map((d) => {
        const active = selected === d
        return (
          <button
            key={d}
            onClick={() => { setSelected(d); onSelect(d) }}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '20px',
              border: `1px solid ${active ? theme.accent : 'var(--border)'}`,
              background: active ? theme.bg : 'var(--surface-2)',
              color: active ? theme.accent : 'var(--muted)',
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {d}
          </button>
        )
      })}
    </div>
  )
}
