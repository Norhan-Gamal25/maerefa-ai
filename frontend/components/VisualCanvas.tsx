'use client'

import type { Mode } from '@/lib/api'
import { THEMES } from '@/lib/themes'

interface Props {
  imageUrl: string
  mode: Mode
}

export default function VisualCanvas({ imageUrl, mode }: Props) {
  const theme = THEMES[mode]

  return (
    <div style={{
      border: `1px solid ${theme.accent}`,
      borderRadius: '12px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', padding: '0.5rem 0.75rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        🎨 Aniconic STEM Visualization — Stable Diffusion XL via Fireworks AI (AMD ROCm)
      </div>
      <img
        src={imageUrl}
        alt="Aniconic STEM visualization — geometric abstract art"
        style={{ width: '100%', display: 'block', maxHeight: '420px', objectFit: 'cover' }}
        loading="lazy"
      />
    </div>
  )
}
