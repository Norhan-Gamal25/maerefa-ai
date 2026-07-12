'use client'

import type { Mode } from '@/lib/api'
import { THEMES } from '@/lib/themes'

interface Props {
  mode: Mode
  onChange: (mode: Mode) => void
}

export default function ModeSelector({ mode, onChange }: Props) {
  const modes: Mode[] = ['kids', 'college', 'researcher']
  return (
    <div style={{ display: 'flex', gap: '0.4rem' }}>
      {modes.map((m) => {
        const theme = THEMES[m]
        const active = m === mode
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '6px',
              border: `1px solid ${active ? theme.accent : 'var(--border)'}`,
              background: active ? theme.bg : 'transparent',
              color: active ? theme.accent : 'var(--muted)',
              fontWeight: active ? 600 : 400,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {theme.label}
          </button>
        )
      })}
    </div>
  )
}
