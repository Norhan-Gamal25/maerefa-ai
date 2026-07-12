'use client'

import { useState } from 'react'
import type { WonderCard, Mode } from '@/lib/api'
import { THEMES } from '@/lib/themes'
import { MixedText } from '@/lib/renderLatex'

interface Props {
  cards: WonderCard[]
  mode: Mode
}

export default function WonderCards({ cards, mode }: Props) {
  const theme = THEMES[mode]
  const [saved, setSaved] = useState<Set<number>>(new Set())

  const toggle = (i: number) => {
    setSaved((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const safeCards = cards ?? []

  return (
    <div>
      <h2 style={{ fontSize: '1rem', color: theme.accent, marginBottom: '0.85rem', fontWeight: 600 }}>✨ Wonder Cards</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {safeCards.map((card, i) => (
          <div
            key={i}
            style={{
              background: 'var(--surface)',
              border: `1px solid ${theme.accent}`,
              borderRadius: '12px',
              padding: '1.25rem',
              position: 'relative',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{card.emoji}</div>
            <p dir="auto" style={{ fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--text)' }}><MixedText text={card.fact} /></p>
            <button
              onClick={() => toggle(i)}
              title="Save this fact"
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.1rem',
                color: saved.has(i) ? theme.accent : 'var(--muted)',
              }}
            >
              {saved.has(i) ? '🔖' : '🏷️'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
