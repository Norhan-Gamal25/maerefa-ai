'use client'

/**
 * ConceptVisualizer — animated SVG diagrams for physics, math, and chemistry topics.
 * Uses requestAnimationFrame for smooth animations; all pure SVG, zero dependencies.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AlgoType } from '@/lib/algoDetector'
import { ALGO_LABELS } from '@/lib/algoDetector'
import type { Mode } from '@/lib/api'
import { THEMES } from '@/lib/themes'

// ─── Accent colour resolver (CSS vars don't work in SVG fill) ────────────────

function resolveAccent(mode: Mode): string {
  return mode === 'kids' ? '#f59e0b' : mode === 'researcher' ? '#14b8a6' : '#6366f1'
}

// ─── Individual animated renderers ───────────────────────────────────────────

// Wave motion
function WaveViz({ accent, t }: { accent: string; t: number }) {
  const W = 480, H = 200, CY = H / 2
  const points = Array.from({ length: 200 }, (_, i) => {
    const x = (i / 199) * W
    const y = CY + 55 * Math.sin((i / 199) * 4 * Math.PI + t) * Math.exp(-((i / 199 - 0.5) ** 2) * 4)
    return `${x},${y}`
  }).join(' ')
  const points2 = Array.from({ length: 200 }, (_, i) => {
    const x = (i / 199) * W
    const y = CY + 30 * Math.sin((i / 199) * 6 * Math.PI + t + 1.5) * 0.5
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <line x1="0" y1={CY} x2={W} y2={CY} stroke="#333" strokeWidth="1" strokeDasharray="4 4" />
      <polyline points={points2} fill="none" stroke={`${accent}55`} strokeWidth="1.5" />
      <polyline points={points} fill="none" stroke={accent} strokeWidth="2.5" />
      <text x="10" y="18" fontSize="11" fill="var(--muted)">y = A·sin(kx − ωt)</text>
      <text x={W - 10} y={H - 8} fontSize="10" fill="var(--muted)" textAnchor="end">→ x</text>
      <text x="10" y={H - 8} fontSize="10" fill="var(--muted)">λ = wavelength  A = amplitude  ω = angular frequency</text>
    </svg>
  )
}

// Simple harmonic motion — mass on spring
function SHMViz({ accent, t }: { accent: string; t: number }) {
  const W = 480, H = 200
  const cx = 240 + 90 * Math.cos(t)
  const springPoints = Array.from({ length: 30 }, (_, i) => {
    const x = 30 + (i / 29) * (cx - 40)
    const y = H / 2 + (i % 2 === 0 ? 0 : 14) * (i > 0 && i < 29 ? 1 : 0)
    return `${x},${y}`
  }).join(' ')
  const vel = -90 * Math.sin(t)
  const acc = -90 * Math.cos(t)
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {/* Wall */}
      <rect x="0" y={H / 2 - 40} width="30" height="80" fill="#333" />
      {/* Spring */}
      <polyline points={springPoints} fill="none" stroke="#888" strokeWidth="2" />
      {/* Mass */}
      <rect x={cx} y={H / 2 - 20} width="40" height="40" rx="4" fill={accent} opacity="0.9" />
      <text x={cx + 20} y={H / 2 + 5} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#fff">m</text>
      {/* Velocity arrow */}
      {Math.abs(vel) > 2 && (
        <line x1={cx + 20} y1={H / 2} x2={cx + 20 + vel * 0.4} y2={H / 2}
          stroke="#22c55e" strokeWidth="2" markerEnd="url(#arr-shm)" />
      )}
      {/* Equilibrium */}
      <line x1="240" y1={H / 2 - 30} x2="240" y2={H / 2 + 30} stroke="#555" strokeWidth="1" strokeDasharray="3 3" />
      <text x="240" y={H - 12} textAnchor="middle" fontSize="10" fill="var(--muted)">x₀ (equilibrium)</text>
      <text x={W - 10} y="18" fontSize="11" fill="var(--muted)" textAnchor="end">a = −ω²x   T = 2π√(m/k)</text>
      <defs>
        <marker id="arr-shm" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="#22c55e" />
        </marker>
      </defs>
    </svg>
  )
}

// Projectile motion
function ProjectileViz({ accent, t }: { accent: string; t: number }) {
  const W = 480, H = 200, g = 9.8, v0 = 18, angle = Math.PI / 4
  const totalT = (2 * v0 * Math.sin(angle)) / g
  const progress = (t % (totalT + 1)) / totalT
  const ballT = Math.min(progress, 1) * totalT
  const ballX = 30 + (v0 * Math.cos(angle) * ballT) * 14
  const ballY = H - 20 - (v0 * Math.sin(angle) * ballT - 0.5 * g * ballT * ballT) * 8

  const trailPoints = Array.from({ length: 60 }, (_, i) => {
    const pt = (i / 59) * Math.min(ballT, totalT)
    const px = 30 + v0 * Math.cos(angle) * pt * 14
    const py = H - 20 - (v0 * Math.sin(angle) * pt - 0.5 * g * pt * pt) * 8
    return `${px},${py}`
  }).join(' ')

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <line x1="0" y1={H - 20} x2={W} y2={H - 20} stroke="#555" strokeWidth="1.5" />
      <polyline points={trailPoints} fill="none" stroke={`${accent}66`} strokeWidth="2" strokeDasharray="4 3" />
      <circle cx={ballX} cy={ballY} r="10" fill={accent} />
      <text x="10" y="20" fontSize="11" fill="var(--muted)">x = v₀cos(θ)·t</text>
      <text x="10" y="36" fontSize="11" fill="var(--muted)">y = v₀sin(θ)·t − ½gt²</text>
      <text x={W - 10} y="20" fontSize="11" fill="var(--muted)" textAnchor="end">Range = v₀²sin(2θ)/g</text>
    </svg>
  )
}

// Electromagnetic field (static dipole field lines)
function EMViz({ accent }: { accent: string }) {
  const W = 480, H = 240
  const lines: string[] = []
  for (let a = 0; a < 360; a += 30) {
    const rad = (a * Math.PI) / 180
    const pts: string[] = []
    let x = 200 + 12 * Math.cos(rad), y = H / 2 + 12 * Math.sin(rad)
    for (let s = 0; s < 80; s++) {
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
      const dx1 = x - 160, dy1 = y - H / 2
      const dx2 = x - 320, dy2 = y - H / 2
      const r1 = Math.sqrt(dx1 ** 2 + dy1 ** 2) + 0.1
      const r2 = Math.sqrt(dx2 ** 2 + dy2 ** 2) + 0.1
      const fx = dx1 / r1 ** 3 - dx2 / r2 ** 3
      const fy = dy1 / r1 ** 3 - dy2 / r2 ** 3
      const mag = Math.sqrt(fx ** 2 + fy ** 2) + 0.001
      x += (fx / mag) * 3
      y += (fy / mag) * 3
      if (x < 0 || x > W || y < 0 || y > H) break
    }
    lines.push(pts.join(' '))
  }
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {lines.map((pts, i) => (
        <polyline key={i} points={pts} fill="none" stroke={`${accent}88`} strokeWidth="1.2" />
      ))}
      <circle cx="160" cy={H / 2} r="12" fill={accent} />
      <text x="160" y={H / 2 + 5} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#fff">+</text>
      <circle cx="320" cy={H / 2} r="12" fill="#ef4444" />
      <text x="320" y={H / 2 + 5} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#fff">−</text>
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">Electric dipole field lines (E ∝ 1/r²)</text>
    </svg>
  )
}

// Circular motion
function CircularViz({ accent, t }: { accent: string; t: number }) {
  const W = 480, H = 220, cx = W / 2, cy = H / 2, R = 80
  const bx = cx + R * Math.cos(t), by = cy + R * Math.sin(t)
  const vx = -Math.sin(t) * 35, vy = Math.cos(t) * 35   // tangential velocity
  const ax = -Math.cos(t) * 25, ay = -Math.sin(t) * 25  // centripetal acceleration
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#444" strokeWidth="1.5" strokeDasharray="5 3" />
      <line x1={cx} y1={cy} x2={bx} y2={by} stroke="#555" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="5" fill="#666" />
      <circle cx={bx} cy={by} r="12" fill={accent} />
      <text x={bx + 14} y={by + 5} fontSize="11" fill="var(--muted)">m</text>
      {/* velocity vector */}
      <line x1={bx} y1={by} x2={bx + vx} y2={by + vy} stroke="#22c55e" strokeWidth="2" markerEnd="url(#arr-circ-v)" />
      <text x={bx + vx + 5} y={by + vy} fontSize="10" fill="#22c55e">v</text>
      {/* centripetal acceleration */}
      <line x1={bx} y1={by} x2={bx + ax} y2={by + ay} stroke="#f87171" strokeWidth="2" markerEnd="url(#arr-circ-a)" />
      <text x={bx + ax - 14} y={by + ay - 5} fontSize="10" fill="#f87171">a_c</text>
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">a_c = v²/r = ω²r   T = 2πr/v</text>
      <defs>
        <marker id="arr-circ-v" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#22c55e" /></marker>
        <marker id="arr-circ-a" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#f87171" /></marker>
      </defs>
    </svg>
  )
}

// Electric circuit (series R-L-C schematic)
function CircuitViz({ accent }: { accent: string }) {
  const W = 480, H = 200
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {/* Wires */}
      <polyline points="50,60 50,160 430,160 430,60" fill="none" stroke="#888" strokeWidth="2" />
      <line x1="50" y1="60" x2="120" y2="60" stroke="#888" strokeWidth="2" />
      <line x1="200" y1="60" x2="260" y2="60" stroke="#888" strokeWidth="2" />
      <line x1="340" y1="60" x2="430" y2="60" stroke="#888" strokeWidth="2" />
      {/* Battery */}
      <line x1="50" y1="50" x2="50" y2="70" stroke={accent} strokeWidth="3" />
      <line x1="44" y1="43" x2="56" y2="43" stroke={accent} strokeWidth="5" />
      <line x1="46" y1="77" x2="54" y2="77" stroke={accent} strokeWidth="2" />
      <text x="58" y="62" fontSize="11" fill={accent}>V</text>
      {/* Resistor zigzag */}
      {Array.from({ length: 6 }, (_, i) => {
        const x1 = 120 + i * 13, y1 = i % 2 === 0 ? 70 : 50
        const x2 = 120 + (i + 1) * 13, y2 = i % 2 === 0 ? 50 : 70
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#888" strokeWidth="2" />
      })}
      <text x="160" y="40" textAnchor="middle" fontSize="11" fill="var(--muted)">R</text>
      {/* Capacitor */}
      <line x1="260" y1="40" x2="260" y2="80" stroke="#888" strokeWidth="2" />
      <line x1="250" y1="40" x2="270" y2="40" stroke={accent} strokeWidth="4" />
      <line x1="250" y1="80" x2="270" y2="80" stroke={accent} strokeWidth="4" />
      <line x1="300" y1="40" x2="300" y2="80" stroke="#888" strokeWidth="2" />
      <text x="280" y="35" textAnchor="middle" fontSize="11" fill="var(--muted)">C</text>
      {/* Inductor coils */}
      {Array.from({ length: 4 }, (_, i) => (
        <path key={i} d={`M ${340 + i * 23} 60 Q ${351 + i * 23} 42 ${363 + i * 23} 60`}
          fill="none" stroke="#888" strokeWidth="2" />
      ))}
      <text x="385" y="40" textAnchor="middle" fontSize="11" fill="var(--muted)">L</text>
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">
        V = IR   Q = CV   V_L = L·dI/dt   Z = √(R² + (X_L−X_C)²)
      </text>
    </svg>
  )
}

// Quantum wave function (probability density animation)
function QuantumViz({ accent, t }: { accent: string; t: number }) {
  const W = 480, H = 200, CY = H / 2
  const wfPts = Array.from({ length: 300 }, (_, i) => {
    const x = (i / 299) * W
    const xi = (i / 299 - 0.5) * 8
    const psi = Math.exp(-xi * xi * 0.5) * Math.cos(3 * xi - t)
    return `${x},${CY - psi * 65}`
  }).join(' ')
  const probPts = Array.from({ length: 300 }, (_, i) => {
    const x = (i / 299) * W
    const xi = (i / 299 - 0.5) * 8
    const psi = Math.exp(-xi * xi * 0.5) * Math.cos(3 * xi - t)
    return `${x},${CY - psi * psi * 60}`
  }).join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <line x1="0" y1={CY} x2={W} y2={CY} stroke="#333" strokeWidth="1" />
      <polyline points={probPts} fill="none" stroke={`${accent}55`} strokeWidth="1.5" strokeDasharray="4 3" />
      <polyline points={wfPts} fill="none" stroke={accent} strokeWidth="2.5" />
      <text x="10" y="18" fontSize="11" fill="var(--muted)">ψ(x,t) — wave function  (solid)</text>
      <text x="10" y="34" fontSize="11" fill={`${accent}99`}>|ψ|² — probability density  (dashed)</text>
      <text x={W - 10} y={H - 8} fontSize="10" fill="var(--muted)" textAnchor="end">ℏ∂ψ/∂t = Ĥψ</text>
    </svg>
  )
}

// Fourier transform — time domain + frequency domain
function FourierViz({ accent, t }: { accent: string; t: number }) {
  const W = 480, H = 200, CY = 70
  const timePts = Array.from({ length: 200 }, (_, i) => {
    const x = (i / 199) * 220 + 10
    const y = CY + 35 * (Math.sin(2 * (i / 199) * 2 * Math.PI + t) + 0.5 * Math.sin(6 * (i / 199) * 2 * Math.PI + t))
    return `${x},${y}`
  }).join(' ')
  const freqs = [1, 3, 5, 7]
  const amps = [1, 0.5, 0.25, 0.12]
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <text x="115" y="14" textAnchor="middle" fontSize="11" fill="var(--muted)">Time Domain</text>
      <line x1="10" y1={CY} x2="230" y2={CY} stroke="#444" strokeWidth="1" />
      <polyline points={timePts} fill="none" stroke={accent} strokeWidth="2" />
      <line x1="250" y1="20" x2="250" y2={H - 20} stroke="#444" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="365" y="14" textAnchor="middle" fontSize="11" fill="var(--muted)">Frequency Domain</text>
      <line x1="260" y1={H - 30} x2={W - 10} y2={H - 30} stroke="#444" strokeWidth="1" />
      {freqs.map((f, i) => {
        const barH = amps[i] * 100
        const x = 270 + i * 48
        return (
          <g key={f}>
            <rect x={x} y={H - 30 - barH} width="22" height={barH} rx="3"
              fill={accent} opacity={0.85 - i * 0.15} />
            <text x={x + 11} y={H - 14} textAnchor="middle" fontSize="10" fill="var(--muted)">{f}f₀</text>
          </g>
        )
      })}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--muted)">{'F(ω) = ∫ f(t)·e^{-iωt} dt'}</text>
    </svg>
  )
}

// Prime sieve — animated striking out
function PrimeSieveViz({ accent, t }: { accent: string; t: number }) {
  const nums = Array.from({ length: 50 }, (_, i) => i + 2)
  const sieveStep = Math.floor(t * 0.8) % 6   // which prime we're currently sieving
  const sievePrimes = [2, 3, 5, 7, 11, 13]
  const composites = new Set<number>()
  for (let k = 0; k <= sieveStep; k++) {
    const p = sievePrimes[k]
    for (let m = p * 2; m <= 51; m += p) composites.add(m)
  }
  const W = 480, COLS = 10
  return (
    <svg width="100%" viewBox={`0 0 ${W} 220`}>
      <text x={W / 2} y="16" textAnchor="middle" fontSize="11" fill="var(--muted)">
        Sieving multiples of {sievePrimes[sieveStep]}…
      </text>
      {nums.map((n, i) => {
        const col = i % COLS, row = Math.floor(i / COLS)
        const x = 15 + col * 46, y = 28 + row * 36
        const isPrime = !composites.has(n)
        const isCurrent = n === sievePrimes[sieveStep]
        return (
          <g key={n}>
            <rect x={x} y={y} width="38" height="28" rx="4"
              fill={isCurrent ? accent : isPrime ? `${accent}44` : 'var(--surface-2)'}
              stroke={isCurrent ? accent : isPrime ? accent : '#444'}
              strokeWidth={isPrime ? 1.5 : 0.5}
            />
            {composites.has(n) && (
              <line x1={x + 4} y1={y + 4} x2={x + 34} y2={y + 24} stroke="#ef4444" strokeWidth="1.5" opacity="0.7" />
            )}
            <text x={x + 19} y={y + 18} textAnchor="middle" fontSize="12"
              fill={isPrime ? (isCurrent ? '#fff' : accent) : 'var(--muted)'}
              fontWeight={isPrime ? '700' : '400'}>{n}</text>
          </g>
        )
      })}
    </svg>
  )
}

// Fibonacci spiral
function FibonacciViz({ accent, t }: { accent: string; t: number }) {
  const W = 480, H = 280
  const fibs = [1, 1, 2, 3, 5, 8, 13, 21]
  const SCALE = 9
  let x = W / 2 - 10 * SCALE, y = H / 2 - 6 * SCALE
  const rects: Array<{ x: number; y: number; w: number; dir: number }> = []
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]]
  let di = 0
  for (let i = 0; i < fibs.length; i++) {
    const s = fibs[i] * SCALE
    rects.push({ x, y, w: s, dir: di % 4 })
    const [dx, dy] = dirs[di % 4]
    x += dx * s; y += dy * s
    if (dx === 1) y -= s
    if (dx === -1) y += s
    di++
  }
  const highlight = Math.floor(t * 0.6) % fibs.length
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.w} rx="2"
          fill={i === highlight ? accent : 'transparent'}
          stroke={accent} strokeWidth={i === highlight ? 2.5 : 1}
          opacity={0.3 + i * 0.09}
        />
      ))}
      {rects.map((r, i) => (
        <text key={`t${i}`} x={r.x + r.w / 2} y={r.y + r.w / 2 + 4}
          textAnchor="middle" fontSize={Math.max(8, r.w * 0.3)}
          fill={i === highlight ? '#fff' : accent} opacity="0.9">
          {fibs[i]}
        </text>
      ))}
      <text x={W - 10} y={H - 8} textAnchor="end" fontSize="10" fill="var(--muted)">
        {'φ = (1+√5)/2 ≈ 1.618  F_n = F_{n-1} + F_{n-2}'}
      </text>
    </svg>
  )
}

// Matrix multiplication — 2×2 step-by-step
function MatrixViz({ accent, t }: { accent: string; t: number }) {
  const W = 480, H = 200
  const A = [[2, 1], [0, 3]], B = [[1, 4], [2, 0]]
  const C = [[2 * 1 + 1 * 2, 2 * 4 + 1 * 0], [0 * 1 + 3 * 2, 0 * 4 + 3 * 0]]
  const step = Math.floor(t * 0.5) % 4
  const row = Math.floor(step / 2), col = step % 2
  const drawMatrix = (mat: number[][], ox: number, oy: number, hlRow: number | null, hlCol: number | null, color: string) => (
    <g>
      <text x={ox - 14} y={oy - 12} fontSize="10" fill="var(--muted)">[</text>
      <text x={ox + 70} y={oy - 12} fontSize="10" fill="var(--muted)">]</text>
      {mat.map((r, ri) => r.map((v, ci) => {
        const isHL = (hlRow === ri) || (hlCol === ci)
        return (
          <g key={`${ri}-${ci}`}>
            <rect x={ox + ci * 36} y={oy + ri * 36} width="32" height="30" rx="4"
              fill={isHL ? `${color}33` : 'var(--surface-2)'}
              stroke={isHL ? color : '#444'} strokeWidth={isHL ? 2 : 1} />
            <text x={ox + ci * 36 + 16} y={oy + ri * 36 + 19}
              textAnchor="middle" fontSize="15" fontWeight="600"
              fill={isHL ? color : 'var(--text)'}>{v}</text>
          </g>
        )
      }))}
    </g>
  )
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {drawMatrix(A, 20, 50, row, null, accent)}
      <text x="110" y="72" fontSize="20" fill="var(--muted)">×</text>
      {drawMatrix(B, 130, 50, null, col, '#22c55e')}
      <text x="230" y="72" fontSize="20" fill="var(--muted)">=</text>
      {drawMatrix(C, 250, 50, row, col, '#f59e0b')}
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">
        C[{row}][{col}] = A[{row}][*] · B[*][{col}] = {C[row][col]}
      </text>
    </svg>
  )
}

// Taylor series expansion for sin(x)
function TaylorViz({ accent, t }: { accent: string; t: number }) {
  const W = 480, H = 200, CY = H / 2
  const terms = Math.floor(t * 0.3) % 5 + 1
  const sinApprox = (x: number, n: number) => {
    let sum = 0
    for (let k = 0; k < n; k++) {
      let fact = 1; for (let j = 1; j <= 2 * k + 1; j++) fact *= j
      sum += ((-1) ** k * x ** (2 * k + 1)) / fact
    }
    return sum
  }
  const truePts = Array.from({ length: 200 }, (_, i) => {
    const x = (i / 199 - 0.5) * 8
    return `${10 + i * 2.3},${CY - Math.sin(x) * 55}`
  }).join(' ')
  const approxPts = Array.from({ length: 200 }, (_, i) => {
    const x = (i / 199 - 0.5) * 8
    const y = Math.max(-90, Math.min(90, sinApprox(x, terms)))
    return `${10 + i * 2.3},${CY - y * 55}`
  }).join(' ')
  const termLabels = ['x', '− x³/3!', '+ x⁵/5!', '− x⁷/7!', '+ x⁹/9!']
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <line x1="10" y1={CY} x2={W - 10} y2={CY} stroke="#333" strokeWidth="1" />
      <polyline points={truePts} fill="none" stroke="#888" strokeWidth="1.5" strokeDasharray="5 3" />
      <polyline points={approxPts} fill="none" stroke={accent} strokeWidth="2.5" />
      <text x="10" y="18" fontSize="11" fill="var(--muted)">sin(x) ≈ {termLabels.slice(0, terms).join(' ')}</text>
      <text x={W - 10} y={H - 8} textAnchor="end" fontSize="10" fill="var(--muted)">Terms: {terms}</text>
      <text x="10" y={H - 8} fontSize="10" fill="#888">--- true sin(x)</text>
    </svg>
  )
}

// Venn diagram
function VennViz({ accent }: { accent: string }) {
  const W = 480, H = 200
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <circle cx="185" cy="105" r="75" fill={`${accent}30`} stroke={accent} strokeWidth="2" />
      <circle cx="295" cy="105" r="75" fill="rgba(239,68,68,0.2)" stroke="#ef4444" strokeWidth="2" />
      <text x="150" y="108" textAnchor="middle" fontSize="13" fill={accent} fontWeight="600">A</text>
      <text x="330" y="108" textAnchor="middle" fontSize="13" fill="#ef4444" fontWeight="600">B</text>
      <text x="240" y="108" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">A∩B</text>
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">
        A∪B = A + B − A∩B   |A∪B| = |A| + |B| − |A∩B|
      </text>
      <text x="100" y={H - 22} fontSize="10" fill="var(--muted)">A only</text>
      <text x="330" y={H - 22} fontSize="10" fill="var(--muted)">B only</text>
    </svg>
  )
}

// Electron orbitals (Bohr-style)
function ElectronOrbitalViz({ accent, t }: { accent: string; t: number }) {
  const W = 480, H = 240, cx = W / 2, cy = H / 2
  const shells = [{ r: 30, e: 2, speed: 1 }, { r: 65, e: 8, speed: 0.6 }, { r: 105, e: 8, speed: 0.35 }]
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {/* Nucleus */}
      <circle cx={cx} cy={cy} r="18" fill={accent} />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fff">+p</text>
      {/* Shells */}
      {shells.map((sh, si) => {
        return (
          <g key={si}>
            <circle cx={cx} cy={cy} r={sh.r} fill="none" stroke="#333" strokeWidth="1.5" strokeDasharray="4 3" />
            <text x={cx + sh.r + 4} y={cy - 4} fontSize="10" fill="var(--muted)">n={si + 1}</text>
            {Array.from({ length: sh.e }, (_, ei) => {
              const angle = (ei / sh.e) * 2 * Math.PI + t * sh.speed
              const ex = cx + sh.r * Math.cos(angle)
              const ey = cy + sh.r * Math.sin(angle)
              return <circle key={ei} cx={ex} cy={ey} r="5" fill="#60a5fa" />
            })}
          </g>
        )
      })}
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">
        Bohr model: E_n = −13.6 eV / n²
      </text>
    </svg>
  )
}

// Chemical bonding — covalent bond diagram
function ChemicalBondViz({ accent }: { accent: string }) {
  const W = 480, H = 200
  // H2O molecule
  const O = { x: W / 2, y: H / 2 - 10 }
  const H1 = { x: W / 2 - 80, y: H / 2 + 50 }
  const H2 = { x: W / 2 + 80, y: H / 2 + 50 }
  const e = accent, eh = '#60a5fa'
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {/* Bonds */}
      <line x1={O.x} y1={O.y} x2={H1.x} y2={H1.y} stroke="#555" strokeWidth="3" />
      <line x1={O.x} y1={O.y} x2={H2.x} y2={H2.y} stroke="#555" strokeWidth="3" />
      {/* Oxygen */}
      <circle cx={O.x} cy={O.y} r="30" fill={`${e}33`} stroke={e} strokeWidth="2.5" />
      <text x={O.x} y={O.y + 5} textAnchor="middle" fontSize="16" fontWeight="bold" fill={e}>O</text>
      {/* Lone pairs */}
      <ellipse cx={O.x - 38} cy={O.y - 10} rx="12" ry="6" fill={`${e}55`} />
      <ellipse cx={O.x + 38} cy={O.y - 10} rx="12" ry="6" fill={`${e}55`} />
      {/* Hydrogens */}
      {[H1, H2].map((h, i) => (
        <g key={i}>
          <circle cx={h.x} cy={h.y} r="20" fill={`${eh}33`} stroke={eh} strokeWidth="2" />
          <text x={h.x} y={h.y + 5} textAnchor="middle" fontSize="15" fontWeight="bold" fill={eh}>H</text>
        </g>
      ))}
      {/* Shared electrons */}
      <circle cx={(O.x + H1.x) / 2 + 5} cy={(O.y + H1.y) / 2 - 5} r="4" fill="#fff" opacity="0.7" />
      <circle cx={(O.x + H1.x) / 2 - 5} cy={(O.y + H1.y) / 2 + 5} r="4" fill="#fff" opacity="0.7" />
      <circle cx={(O.x + H2.x) / 2 - 5} cy={(O.y + H2.y) / 2 - 5} r="4" fill="#fff" opacity="0.7" />
      <circle cx={(O.x + H2.x) / 2 + 5} cy={(O.y + H2.y) / 2 + 5} r="4" fill="#fff" opacity="0.7" />
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">
        H₂O — 2 covalent bonds, 2 lone pairs on O, bond angle ≈ 104.5°
      </text>
    </svg>
  )
}

// Periodic table — first 18 elements
function PeriodicViz({ accent }: { accent: string }) {
  const elements = [
    { sym: 'H', n: 1, g: 1, p: 1 }, { sym: 'He', n: 2, g: 18, p: 1 },
    { sym: 'Li', n: 3, g: 1, p: 2 }, { sym: 'Be', n: 4, g: 2, p: 2 },
    { sym: 'B', n: 5, g: 13, p: 2 }, { sym: 'C', n: 6, g: 14, p: 2 },
    { sym: 'N', n: 7, g: 15, p: 2 }, { sym: 'O', n: 8, g: 16, p: 2 },
    { sym: 'F', n: 9, g: 17, p: 2 }, { sym: 'Ne', n: 10, g: 18, p: 2 },
    { sym: 'Na', n: 11, g: 1, p: 3 }, { sym: 'Mg', n: 12, g: 2, p: 3 },
    { sym: 'Al', n: 13, g: 13, p: 3 }, { sym: 'Si', n: 14, g: 14, p: 3 },
    { sym: 'P', n: 15, g: 15, p: 3 }, { sym: 'S', n: 16, g: 16, p: 3 },
    { sym: 'Cl', n: 17, g: 17, p: 3 }, { sym: 'Ar', n: 18, g: 18, p: 3 },
  ]
  const groupColors: Record<number, string> = {
    1: '#6366f1', 2: '#8b5cf6', 13: '#f59e0b', 14: '#10b981',
    15: '#3b82f6', 16: '#ef4444', 17: '#ec4899', 18: '#6b7280',
  }
  const W = 480, CW = 24, CH = 30, GAP = 2
  const groupX: Record<number, number> = { 1: 0, 2: 1, 13: 8, 14: 9, 15: 10, 16: 11, 17: 12, 18: 13 }
  return (
    <svg width="100%" viewBox={`0 0 ${W} 130`}>
      {elements.map((el) => {
        const gx = groupX[el.g] ?? el.g - 1
        const x = 8 + gx * (CW + GAP)
        const y = 8 + (el.p - 1) * (CH + GAP)
        const color = groupColors[el.g] ?? accent
        return (
          <g key={el.n}>
            <rect x={x} y={y} width={CW} height={CH} rx="3"
              fill={`${color}33`} stroke={color} strokeWidth="1.2" />
            <text x={x + CW / 2} y={y + 11} textAnchor="middle" fontSize="7" fill="var(--muted)">{el.n}</text>
            <text x={x + CW / 2} y={y + 23} textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>{el.sym}</text>
          </g>
        )
      })}
      <text x={W / 2} y="118" textAnchor="middle" fontSize="9" fill="var(--muted)">First 18 elements — colour by group</text>
    </svg>
  )
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

interface VizProps { accent: string; t: number }

function renderConceptViz(type: AlgoType, props: VizProps) {
  switch (type) {
    case 'wave':            return <WaveViz {...props} />
    case 'simple_harmonic': return <SHMViz {...props} />
    case 'projectile':      return <ProjectileViz {...props} />
    case 'electromagnetic': return <EMViz accent={props.accent} />
    case 'circular_motion': return <CircularViz {...props} />
    case 'electric_circuit':return <CircuitViz accent={props.accent} />
    case 'quantum_wave':    return <QuantumViz {...props} />
    case 'fourier':         return <FourierViz {...props} />
    case 'prime_sieve':     return <PrimeSieveViz {...props} />
    case 'fibonacci':       return <FibonacciViz {...props} />
    case 'matrix_multiply': return <MatrixViz {...props} />
    case 'taylor_series':   return <TaylorViz {...props} />
    case 'venn_diagram':    return <VennViz accent={props.accent} />
    case 'electron_orbital':return <ElectronOrbitalViz {...props} />
    case 'chemical_bond':   return <ChemicalBondViz accent={props.accent} />
    case 'periodic_table':  return <PeriodicViz accent={props.accent} />
    default:                return null
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  algoType: AlgoType
  mode: Mode
}

export default function ConceptVisualizer({ algoType, mode }: Props) {
  const accent = resolveAccent(mode)
  const [t, setT] = useState(0)
  const [paused, setPaused] = useState(false)
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef<number>(0)

  // Static types (no animation needed)
  const isStatic = ['electromagnetic', 'electric_circuit', 'venn_diagram', 'chemical_bond', 'periodic_table'].includes(algoType)

  const tick = useCallback((now: number) => {
    if (lastRef.current) {
      const dt = (now - lastRef.current) / 1000
      setT(prev => prev + dt * 1.5)
    }
    lastRef.current = now
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    if (paused || isStatic) return
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); lastRef.current = 0 }
  }, [tick, paused, isStatic])

  const btnBase: React.CSSProperties = {
    padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer',
    border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)',
  }

  return (
    <div className="card" style={{ borderColor: accent, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '0.55rem 0.9rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--muted)', flex: 1 }}>
          ⬡ Interactive Visualization — {ALGO_LABELS[algoType]}
        </span>
        {!isStatic && (
          <button style={btnBase} onClick={() => setPaused(p => !p)}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
        )}
      </div>
      <div style={{ background: 'var(--bg)', padding: '1rem 0.5rem 0.5rem', minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {renderConceptViz(algoType, { accent, t })}
      </div>
    </div>
  )
}
