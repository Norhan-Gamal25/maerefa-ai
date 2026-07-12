'use client'

import type { Mode } from '@/lib/api'
import { THEMES } from '@/lib/themes'
import { MixedText } from '@/lib/renderLatex'

interface Props {
  explanation: Record<string, unknown>
  mode: Mode
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

/**
 * Safely convert any value to a renderable string.
 * Handles the case where the LLM returns objects like
 * {equation: "...", explanation: "..."} instead of plain strings.
 */
function toStr(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    // Flatten known object shapes the LLM tends to return
    const obj = value as Record<string, unknown>
    const parts: string[] = []
    // equation-style: {equation, explanation} or {formula, description} etc.
    const equationKey = Object.keys(obj).find(k => /^(equation|formula|latex|expression|eq)$/i.test(k))
    const explanationKey = Object.keys(obj).find(k => /^(explanation|description|desc|note|meaning)$/i.test(k))
    if (equationKey) parts.push(String(obj[equationKey]))
    if (explanationKey) parts.push(`— ${String(obj[explanationKey])}`)
    if (parts.length) return parts.join(' ')
    // Generic fallback: join all string values
    const vals = Object.values(obj).filter(v => typeof v === 'string' || typeof v === 'number')
    if (vals.length) return vals.map(String).join(' — ')
    return JSON.stringify(value)
  }
  return String(value)
}

/** Render an unknown value as a MixedText node (LaTeX + RTL aware). */
function MixedValue({ value }: { value: unknown }) {
  return <MixedText text={toStr(value)} />
}

export default function ExplanationPanel({ explanation, mode }: Props) {
  const theme = THEMES[mode]
  const safe = explanation ?? {}

  const renderKids = () => (
    <>
      {safe.big_idea && (
        <Section label="🌟 Big Idea">
          <p style={{ fontSize: '1.15rem', fontWeight: 600, color: theme.accent }}>
            <MixedText text={String(safe.big_idea)} />
          </p>
        </Section>
      )}
      {safe.how_it_works && (
        <Section label="📖 How It Works">
          <p dir="auto"><MixedText text={String(safe.how_it_works)} /></p>
        </Section>
      )}
      {safe.wow_moment && (
        <Section label="💡 Wow Moment">
          <p style={{ color: theme.accent }} dir="auto"><MixedText text={String(safe.wow_moment)} /></p>
        </Section>
      )}
      {safe.try_this && (
        <Section label="🎮 Try This">
          <p dir="auto" style={{ background: 'var(--surface-2)', padding: '0.75rem', borderRadius: '8px', borderLeft: `3px solid ${theme.accent}` }}>
            <MixedText text={String(safe.try_this)} />
          </p>
        </Section>
      )}
    </>
  )

  const renderCollege = () => (
    <>
      {safe.concept_overview && (
        <Section label="📖 Concept Overview">
          <p dir="auto"><MixedText text={String(safe.concept_overview)} /></p>
        </Section>
      )}
      {Array.isArray(safe.key_equations) && safe.key_equations.length > 0 && (
        <Section label="📐 Key Equations">
          {(safe.key_equations as unknown[]).map((eq, i) => (
            <div key={i} style={{ background: 'var(--surface-2)', padding: '0.65rem 0.9rem', borderRadius: '6px', marginBottom: '0.4rem', fontSize: '0.92rem', borderLeft: `3px solid ${theme.accent}`, overflowX: 'auto' }}>
              <MixedValue value={eq} />
            </div>
          ))}
        </Section>
      )}
      {safe.physical_intuition && (
        <Section label="💡 Physical Intuition">
          <p dir="auto"><MixedText text={String(safe.physical_intuition)} /></p>
        </Section>
      )}
      {Array.isArray(safe.applications) && safe.applications.length > 0 && (
        <Section label="🔬 Applications">
          <ul style={{ paddingLeft: '1.2rem' }}>
            {(safe.applications as unknown[]).map((a, i) => (
              <li key={i} style={{ marginBottom: '0.3rem' }} dir="auto"><MixedValue value={a} /></li>
            ))}
          </ul>
        </Section>
      )}
    </>
  )

  const renderResearcher = () => (
    <>
      {safe.state_of_knowledge && (
        <Section label="📊 State of Knowledge">
          <p dir="auto"><MixedText text={String(safe.state_of_knowledge)} /></p>
        </Section>
      )}
      {Array.isArray(safe.research_gaps) && safe.research_gaps.length > 0 && (
        <Section label="🔍 Research Gaps">
          <ul style={{ paddingLeft: '1.2rem' }}>
            {(safe.research_gaps as unknown[]).map((g, i) => (
              <li key={i} style={{ marginBottom: '0.3rem' }} dir="auto"><MixedValue value={g} /></li>
            ))}
          </ul>
        </Section>
      )}
      {Array.isArray(safe.cross_domain_links) && safe.cross_domain_links.length > 0 && (
        <Section label="🔗 Cross-Domain Links">
          <ul style={{ paddingLeft: '1.2rem' }}>
            {(safe.cross_domain_links as unknown[]).map((l, i) => (
              <li key={i} style={{ marginBottom: '0.25rem' }} dir="auto"><MixedValue value={l} /></li>
            ))}
          </ul>
        </Section>
      )}
      {Array.isArray(safe.research_directions) && safe.research_directions.length > 0 && (
        <Section label="🚀 Research Directions">
          <ul style={{ paddingLeft: '1.2rem' }}>
            {(safe.research_directions as unknown[]).map((d, i) => (
              <li key={i} style={{ marginBottom: '0.25rem' }} dir="auto"><MixedValue value={d} /></li>
            ))}
          </ul>
        </Section>
      )}
      {Array.isArray(safe.key_references) && safe.key_references.length > 0 && (
        <Section label="📚 Key References">
          {(safe.key_references as unknown[]).map((r, i) => (
            <div key={i} dir="auto" style={{ fontStyle: 'italic', fontSize: '0.88rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>
              <MixedValue value={r} />
            </div>
          ))}
        </Section>
      )}
    </>
  )

  const hasContent = Object.keys(safe).length > 0
  if (!hasContent) return null

  return (
    <div className="card" style={{ borderColor: theme.accent }}>
      <h2 style={{ fontSize: '1rem', color: theme.accent, marginBottom: '1rem', fontWeight: 600 }}>
        {mode === 'kids' ? '📖 Explanation' : mode === 'college' ? '📖 Technical Explanation' : '📊 Research Analysis'}
      </h2>
      {mode === 'kids' && renderKids()}
      {mode === 'college' && renderCollege()}
      {mode === 'researcher' && renderResearcher()}
    </div>
  )
}
