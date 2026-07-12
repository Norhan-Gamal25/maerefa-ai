'use client'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="islamic-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '700px' }}>
        {/* Islamic geometric logo */}
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ marginBottom: '1.5rem' }}>
          <polygon points="40,5 50,22 68,22 55,33 60,51 40,40 20,51 25,33 12,22 30,22" fill="none" stroke="#6366f1" strokeWidth="1.5"/>
          <polygon points="40,15 47,28 62,28 50,36 54,50 40,42 26,50 30,36 18,28 33,28" fill="rgba(99,102,241,0.1)" stroke="#6366f1" strokeWidth="0.5"/>
          <circle cx="40" cy="40" r="6" fill="#6366f1" opacity="0.8"/>
        </svg>

        <h1 style={{ fontSize: '2.8rem', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
          Maerefa AI
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
           Maerefa - معرفة
        </p>
        <p style={{ fontSize: '1.15rem', marginBottom: '2.5rem', lineHeight: 1.7 }}>
          Where Creativity Meets STEM.<br/>
          <span style={{ color: 'var(--muted)' }}> Safe · Visually stunning · Deeply educational</span>
        </p>

        {/* Mode cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
          {[
            { mode: 'kids', label: '🌟 Kids', desc: 'Ages 8–14', color: 'var(--accent-kids)', glow: 'var(--accent-kids-glow)' },
            { mode: 'college', label: '📐 College', desc: 'Undergrad level', color: 'var(--accent-college)', glow: 'var(--accent-college-glow)' },
            { mode: 'researcher', label: '🔬 Researcher', desc: 'PhD & beyond', color: 'var(--accent-researcher)', glow: 'var(--accent-researcher-glow)' },
          ].map(({ mode, label, desc, color, glow }) => (
            <Link key={mode} href={`/studio?mode=${mode}`}>
              <div style={{
                background: 'var(--surface)',
                border: `1px solid ${color}`,
                borderRadius: '12px',
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
                boxShadow: `0 0 0 0 ${glow}`,
              }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 0 20px 4px ${glow}`)}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ fontSize: '1.4rem', marginBottom: '0.3rem' }}>{label}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Domains */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {['Mathematics', 'Physics', 'Chemistry', 'Computer Science'].map((d) => (
            <span key={d} style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '0.3rem 0.9rem',
              fontSize: '0.85rem',
              color: 'var(--muted)',
            }}>{d}</span>
          ))}
        </div>

        <Link href="/studio">
          <button className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.8rem 2rem' }}>
            Enter the Studio →
          </button>
        </Link>
      </div>
    </main>
  )
}
