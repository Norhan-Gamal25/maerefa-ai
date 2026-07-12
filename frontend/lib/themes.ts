import type { Mode } from './api'

export interface ModeTheme {
  accent: string
  glow: string
  bg: string
  label: string
}

export const THEMES: Record<Mode, ModeTheme> = {
  kids: {
    accent: 'var(--accent-kids)',
    glow: 'var(--accent-kids-glow)',
    bg: 'rgba(245, 158, 11, 0.06)',
    label: '🌟 Kids',
  },
  college: {
    accent: 'var(--accent-college)',
    glow: 'var(--accent-college-glow)',
    bg: 'rgba(99, 102, 241, 0.06)',
    label: '📐 College',
  },
  researcher: {
    accent: 'var(--accent-researcher)',
    glow: 'var(--accent-researcher-glow)',
    bg: 'rgba(20, 184, 166, 0.06)',
    label: '🔬 Researcher',
  },
}
