/**
 * Topic detector: maps a prompt string to a visualization type.
 * Covers CS algorithms, physics, mathematics, chemistry, and general STEM.
 */

export type AlgoType =
  // CS algorithms
  | 'bfs'
  | 'dfs'
  | 'bubble_sort'
  | 'merge_sort'
  | 'quick_sort'
  | 'binary_search'
  | 'binary_tree'
  | 'linked_list'
  | 'stack'
  | 'queue'
  | 'dijkstra'
  | 'hash_table'
  // Physics
  | 'wave'
  | 'simple_harmonic'
  | 'electromagnetic'
  | 'projectile'
  | 'circular_motion'
  | 'electric_circuit'
  | 'quantum_wave'
  // Mathematics
  | 'fourier'
  | 'prime_sieve'
  | 'fibonacci'
  | 'matrix_multiply'
  | 'taylor_series'
  | 'venn_diagram'
  // Chemistry
  | 'periodic_table'
  | 'electron_orbital'
  | 'chemical_bond'

const PATTERNS: Array<{ type: AlgoType; patterns: RegExp[] }> = [
  // CS algorithms
  { type: 'bfs',          patterns: [/\bbfs\b/i, /breadth[\s-]?first/i] },
  { type: 'dfs',          patterns: [/\bdfs\b/i, /depth[\s-]?first/i] },
  { type: 'bubble_sort',  patterns: [/bubble[\s-]?sort/i] },
  { type: 'merge_sort',   patterns: [/merge[\s-]?sort/i] },
  { type: 'quick_sort',   patterns: [/quick[\s-]?sort/i] },
  { type: 'binary_search',patterns: [/binary[\s-]?search/i] },
  { type: 'binary_tree',  patterns: [/binary[\s-]?(search[\s-]?)?tree/i, /\bbst\b/i] },
  { type: 'linked_list',  patterns: [/linked[\s-]?list/i] },
  { type: 'stack',        patterns: [/\bstack\b/i, /\blifo\b/i] },
  { type: 'queue',        patterns: [/\bqueue\b/i, /\bfifo\b/i] },
  { type: 'dijkstra',     patterns: [/dijkstra/i, /shortest[\s-]?path/i] },
  { type: 'hash_table',   patterns: [/hash[\s-]?(table|map)/i, /\bhashing\b/i] },
  // Physics
  { type: 'wave',               patterns: [/\bwave\b/i, /\bwaves\b/i, /wave[\s-]?function/i, /\bwavelength\b/i, /\bamplitude\b/i, /\bfrequency\b/i] },
  { type: 'simple_harmonic',    patterns: [/simple[\s-]?harmonic/i, /\boscillat/i, /\bpendulum\b/i, /\bspring\b.*\bforce\b/i] },
  { type: 'electromagnetic',    patterns: [/electro[\s-]?magnet/i, /maxwell/i, /\bmagnet\b/i, /faraday/i, /\belectric[\s-]?field\b/i] },
  { type: 'projectile',         patterns: [/projectile/i, /\btrajectory\b/i, /\bparabolic[\s-]?motion\b/i] },
  { type: 'circular_motion',    patterns: [/circular[\s-]?motion/i, /\bcentripetal\b/i, /\borbital\b/i] },
  { type: 'electric_circuit',   patterns: [/\bcircuit\b/i, /\bresistor\b/i, /\bohm'?s[\s-]?law\b/i, /\bvoltage\b/i, /\bcapacitor\b/i] },
  { type: 'quantum_wave',       patterns: [/quantum/i, /\bqubit\b/i, /\bschrödinger\b/i, /schrodinger/i, /entanglement/i, /superposition/i, /\bwavefunction\b/i] },
  // Mathematics
  { type: 'fourier',        patterns: [/fourier/i, /\bfft\b/i, /frequency[\s-]?domain/i, /\bspectrum\b/i] },
  { type: 'prime_sieve',    patterns: [/\bprime\b/i, /\bsieve\b/i, /prime[\s-]?number/i] },
  { type: 'fibonacci',      patterns: [/fibonacci/i, /golden[\s-]?ratio/i, /\bfractal\b/i] },
  { type: 'matrix_multiply',patterns: [/\bmatrix\b/i, /linear[\s-]?algebra/i, /\beigenvalue\b/i, /\bdeterminant\b/i] },
  { type: 'taylor_series',  patterns: [/taylor[\s-]?series/i, /maclaurin/i, /\bseries[\s-]?expansion\b/i, /taylor.*derivative|derivative.*taylor/i] },
  { type: 'venn_diagram',   patterns: [/\bset[\s-]?theory\b/i, /\bintersection\b/i, /\bunion\b/i, /\bvenn\b/i] },
  // Chemistry
  { type: 'periodic_table',  patterns: [/periodic[\s-]?table/i, /\belement\b/i, /\batomic[\s-]?number\b/i] },
  { type: 'electron_orbital', patterns: [/\borbital\b/i, /\belectron[\s-]?config/i, /\batomic[\s-]?struct/i, /\bbohr\b/i, /quantum[\s-]?number/i] },
  { type: 'chemical_bond',    patterns: [/\bbond\b/i, /covalent/i, /ionic[\s-]?bond/i, /\bmolecule\b/i, /\bchemical[\s-]?reaction\b/i] },
]

export function detectAlgo(prompt: string): AlgoType | null {
  if (!prompt) return null
  // Find the earliest match position in the prompt so that when the user
  // asks about multiple topics (e.g. "DFS and BFS") we return whichever
  // appears first in the text rather than whichever is first in PATTERNS.
  let bestType: AlgoType | null = null
  let bestIndex = Infinity
  for (const { type, patterns } of PATTERNS) {
    for (const p of patterns) {
      const m = p.exec(prompt)
      if (m && m.index < bestIndex) {
        bestIndex = m.index
        bestType = type
      }
    }
  }
  return bestType
}

/**
 * Detect ALL visualization types mentioned in a prompt, ordered by first
 * appearance. Used when the user asks to compare algorithms like
 * "DFS vs BFS vs Dijkstra" — we render a tab-switcher for each one.
 *
 * Deduplication: if two pattern sets overlap on the same text span
 * (e.g. "binary search" matching both binary_search and binary_tree)
 * the longer (more specific) match wins and the shorter is dropped.
 */
export function detectAllAlgos(prompt: string): AlgoType[] {
  if (!prompt) return []

  const found: Array<{ type: AlgoType; index: number; end: number }> = []

  for (const { type, patterns } of PATTERNS) {
    let bestIndex = Infinity
    let bestEnd = 0
    for (const p of patterns) {
      const m = p.exec(prompt)
      if (m) {
        const end = m.index + m[0].length
        if (m.index < bestIndex || (m.index === bestIndex && end > bestEnd)) {
          bestIndex = m.index
          bestEnd = end
        }
      }
    }
    if (bestIndex !== Infinity) {
      found.push({ type, index: bestIndex, end: bestEnd })
    }
  }

  // Sort by match position; ties broken by longer match first
  found.sort((a, b) => a.index - b.index || (b.end - b.index) - (a.end - a.index))

  // Span-dedup: skip any match whose start falls inside a previous match's span
  const result: AlgoType[] = []
  let lastEnd = -1
  for (const f of found) {
    if (f.index < lastEnd) continue   // overlaps with a previous (longer) match
    result.push(f.type)
    lastEnd = f.end
  }

  return result
}

export const ALGO_LABELS: Record<AlgoType, string> = {
  bfs: 'Breadth-First Search',
  dfs: 'Depth-First Search',
  bubble_sort: 'Bubble Sort',
  merge_sort: 'Merge Sort',
  quick_sort: 'Quick Sort',
  binary_search: 'Binary Search',
  binary_tree: 'Binary Search Tree',
  linked_list: 'Linked List',
  stack: 'Stack (LIFO)',
  queue: 'Queue (FIFO)',
  dijkstra: "Dijkstra's Shortest Path",
  hash_table: 'Hash Table',
  wave: 'Wave Motion',
  simple_harmonic: 'Simple Harmonic Motion',
  electromagnetic: 'Electromagnetic Fields',
  projectile: 'Projectile Motion',
  circular_motion: 'Circular Motion',
  electric_circuit: 'Electric Circuit',
  quantum_wave: 'Quantum Wave Function',
  fourier: 'Fourier Transform',
  prime_sieve: 'Sieve of Eratosthenes',
  fibonacci: 'Fibonacci / Golden Ratio',
  matrix_multiply: 'Matrix Multiplication',
  taylor_series: 'Taylor Series Expansion',
  venn_diagram: 'Set Theory / Venn Diagram',
  periodic_table: 'Periodic Table',
  electron_orbital: 'Electron Orbitals',
  chemical_bond: 'Chemical Bonding',
}

export const VIZ_CATEGORY: Record<AlgoType, 'algo' | 'physics' | 'math' | 'chemistry'> = {
  bfs: 'algo', dfs: 'algo', bubble_sort: 'algo', merge_sort: 'algo', quick_sort: 'algo',
  binary_search: 'algo', binary_tree: 'algo', linked_list: 'algo', stack: 'algo', queue: 'algo',
  dijkstra: 'algo', hash_table: 'algo',
  wave: 'physics', simple_harmonic: 'physics', electromagnetic: 'physics',
  projectile: 'physics', circular_motion: 'physics', electric_circuit: 'physics', quantum_wave: 'physics',
  fourier: 'math', prime_sieve: 'math', fibonacci: 'math', matrix_multiply: 'math',
  taylor_series: 'math', venn_diagram: 'math',
  periodic_table: 'chemistry', electron_orbital: 'chemistry', chemical_bond: 'chemistry',
}
