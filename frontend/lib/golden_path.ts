import type { MaerefaResult, Mode } from './api'

/**
 * Fix 3 — Golden Path Cache
 * Returns a perfect pre-generated response for the 3 canonical demo prompts.
 * These return instantly without any API call — crucial for live demos.
 */

const GOLDEN_PATHS: Record<string, MaerefaResult> = {
  'explain quantum entanglement|college': {
    mode: 'college',
    explanation: {
      concept_overview:
        'Quantum entanglement is a phenomenon where two or more particles become correlated such that the quantum state of each cannot be described independently, regardless of the distance separating them.',
      key_equations: [
        '|Φ⁺⟩ = (1/√2)(|00⟩ + |11⟩)  — Bell state (maximally entangled)',
        "S = 2√2 ≈ 2.828  — Tsirelson's bound (quantum limit of Bell inequality)",
      ],
      physical_intuition:
        "Measuring one particle's spin instantly collapses the joint wavefunction, determining the other's outcome. This is not faster-than-light communication — no information can be transmitted, only correlations confirmed after classical communication.",
      applications: [
        'Quantum key distribution (BB84 protocol) — unbreakable cryptography',
        'Quantum teleportation of qubit states',
        'Entanglement-enhanced sensing and metrology',
      ],
    },
    wonder_cards: [
      { emoji: '🌌', fact: 'Entanglement has been verified across 1,200 km via satellite (Micius, 2017).' },
      { emoji: '🔐', fact: "Bell's theorem (1964) proved no local hidden variable theory can reproduce quantum predictions." },
      { emoji: '⚡', fact: 'Quantum teleportation moves information, not matter — the state is destroyed at origin upon reading.' },
    ],
    quiz: {
      questions: [
        {
          question: 'Which of the following best describes a Bell state?',
          type: 'mcq',
          options: [
            'A) A separable two-qubit state',
            'B) A maximally entangled two-qubit state',
            'C) A mixed classical state',
            'D) A single-qubit superposition',
          ],
          correct: 'B',
          explanation:
            'Bell states are the four maximally entangled two-qubit states. They cannot be written as a tensor product of single-qubit states.',
        },
      ],
    },
    image_url: null,
    agent_trace: ['STEM Sentinel (GLM-5.2)', 'The Scholar (GLM-5.1)', 'Wonder Weaver (GLM-5.1)', 'The Examiner (GLM-5.1)'],
  },

  'explain fractals|kids': {
    mode: 'kids',
    explanation: {
      big_idea: 'Fractals are magical shapes that look the same no matter how close you zoom in — forever!',
      how_it_works:
        'Imagine a snowflake with six arms. Now look at one arm — it has smaller arms! And those arms have even tinier arms! This goes on and on, infinitely. Fractals are patterns that repeat at every scale, like an endless mirror of mirrors.',
      wow_moment: 'The Mandelbrot Set — the most famous fractal — fits inside a circle of radius 2, yet its boundary has infinite length!',
      try_this:
        'Fold a piece of paper in half, then in half again, and again. Unfold it and look at the creases — they form a fractal pattern called the Dragon Curve!',
    },
    wonder_cards: [
      { emoji: '❄️', fact: 'No two snowflakes are identical, but all follow the same fractal math.' },
      { emoji: '🌀', fact: 'The golden spiral (φ = 1.618…) is a fractal pattern found in pinecones and galaxies alike.' },
      { emoji: '∞', fact: 'The Sierpiński triangle has zero area but infinite perimeter — it is a 1.585-dimensional object!' },
    ],
    quiz: {
      questions: [
        {
          question: 'What makes a fractal special? 🔍',
          type: 'mcq',
          options: [
            'A) It has only straight lines 📏',
            'B) It looks the same when zoomed in 🔎',
            'C) It only exists in computers 💻',
            'D) It has exactly 6 sides ⬡',
          ],
          correct: 'B',
          explanation: 'Fractals are self-similar — they repeat their pattern at every scale. Zoom in as much as you want, the pattern keeps appearing!',
        },
      ],
    },
    image_url: null,
    agent_trace: ['STEM Sentinel (GLM-5.2)', 'Wonder Narrator (GLM-5.1)', 'Quiz Elf (GLM-5.1)'],
  },

  'open problems in prime number theory|researcher': {
    mode: 'researcher',
    explanation: {
      state_of_knowledge:
        'Prime number theory sits at the intersection of analytic number theory, algebraic geometry, and computational complexity. The distribution of primes is well-described asymptotically by the Prime Number Theorem, yet fine-grained structure remains deeply mysterious.',
      research_gaps: [
        'Riemann Hypothesis (RH): all non-trivial zeros of ζ(s) lie on Re(s) = 1/2 — unproven since 1859',
        'Twin Prime Conjecture: infinitely many primes p such that p+2 is also prime (Yitang Zhang, 2013 bounded gaps)',
        'Goldbach Conjecture: every even integer > 2 is sum of two primes — verified to 4×10¹⁸, unproven generally',
        'Legendre Conjecture: prime between n² and (n+1)² for all n — open',
        "Polynomial-time primality: AKS (2002) settles P, but gap between deterministic and probabilistic algorithms persists",
      ],
      cross_domain_links: [
        'Quantum chaos: Montgomery–Odlyzko Law connects RH zeros to GUE eigenvalue statistics',
        'Cryptography: RSA, elliptic curve crypto depend on hardness of prime factorization',
        'Algebraic geometry: Weil conjectures (proven) inspire arithmetic geometry approaches to RH',
      ],
      research_directions: [
        'Spectral approaches: construct a Hermitian operator whose eigenvalues are ζ zeros',
        'Machine learning-assisted prime gap prediction and pattern detection',
        'p-adic analysis and adelic methods for automorphic forms',
      ],
      key_references: [
        'Riemann, B. (1859). Über die Anzahl der Primzahlen unter einer gegebenen Größe.',
        'Zhang, Y. (2014). Bounded gaps between primes. Ann. Math., 179(3).',
        'Maynard, J. (2015). Small gaps between primes. Ann. Math., 181(1).',
        'Tao, T. (2016). The Erdős discrepancy problem. Discrete Analysis.',
      ],
    },
    wonder_cards: [
      { emoji: '🎲', fact: 'The gaps between prime zeros follow the same statistical distribution as energy levels in heavy atomic nuclei — a stunning connection between number theory and quantum physics.' },
      { emoji: '🔐', fact: 'The security of most internet encryption (RSA-2048) depends entirely on the hardness of factoring 617-digit numbers into their prime components.' },
      { emoji: '∞', fact: 'The largest known prime (as of 2024) has 41,024,320 digits — found by the Great Internet Mersenne Prime Search (GIMPS).' },
    ],
    quiz: {
      questions: [
        {
          question: 'Describe a plausible spectral interpretation of the Riemann Hypothesis and what physical system could model it.',
          type: 'open-ended',
          options: [],
          correct: 'open',
          explanation: 'The Hilbert–Pólya conjecture proposes a self-adjoint operator whose eigenvalues are the imaginary parts of RH zeros. Montgomery and Odlyzko showed zero spacings match GUE random matrix statistics, suggesting a chaotic Hamiltonian.',
        },
      ],
    },
    image_url: null,
    agent_trace: ['STEM Sentinel (GLM-5.2)', 'Research Analyst (GLM-5.1)', 'Frontier Scout (GLM-5.1)', 'Peer Reviewer (GLM-5.1)'],
  },
}

export function checkGoldenPath(prompt: string, mode: Mode): MaerefaResult | null {
  const key = `${prompt.toLowerCase().trim()}|${mode}`
  return GOLDEN_PATHS[key] ?? null
}
