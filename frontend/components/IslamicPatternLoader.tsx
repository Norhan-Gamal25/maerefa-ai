'use client'

export default function IslamicPatternLoader() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '3rem',
    }}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <style>{`
          @keyframes spin1 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes spin2 { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
          .r1 { transform-origin: 40px 40px; animation: spin1 3s linear infinite; }
          .r2 { transform-origin: 40px 40px; animation: spin2 5s linear infinite; }
        `}</style>
        <g className="r1">
          <polygon
            points="40,5 44,18 57,15 48,25 53,38 40,31 27,38 32,25 23,15 36,18"
            fill="none"
            stroke="#6366f1"
            strokeWidth="1.2"
            opacity="0.8"
          />
        </g>
        <g className="r2">
          <polygon
            points="40,12 43,22 53,19 46,27 50,37 40,32 30,37 34,27 27,19 37,22"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="0.8"
            opacity="0.6"
          />
        </g>
        <circle cx="40" cy="40" r="5" fill="#6366f1" opacity="0.7" />
      </svg>
    </div>
  )
}
