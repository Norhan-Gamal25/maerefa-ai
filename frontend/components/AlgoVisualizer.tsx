'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AlgoType } from '@/lib/algoDetector'
import { ALGO_LABELS, VIZ_CATEGORY } from '@/lib/algoDetector'
import type { Mode } from '@/lib/api'
import { THEMES } from '@/lib/themes'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Step {
  description: string
  highlight: Set<string>   // node / index IDs currently active
  visited: Set<string>     // permanently marked
  swap?: [number, number]
  comparing?: [number, number]
  found?: number
  path?: string[]
  array?: number[]         // current array snapshot (for sorting/search)
  callStack?: Array<{ node: string; status: 'active' | 'returning' }>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a random integer array of given length in range [min,max]. */
function randomArray(len: number, min = 4, max = 99): number[] {
  return Array.from({ length: len }, () => Math.floor(Math.random() * (max - min + 1)) + min)
}

/** Clamp n to [lo,hi]. */
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

// ─── Graph nodes & edges ─────────────────────────────────────────────────────

const GRAPH_NODES: Record<string, { x: number; y: number }> = {
  A: { x: 240, y: 40 },
  B: { x: 120, y: 120 },
  C: { x: 360, y: 120 },
  D: { x: 60,  y: 210 },
  E: { x: 190, y: 210 },
  F: { x: 310, y: 210 },
  G: { x: 430, y: 210 },
}

const GRAPH_EDGES: [string, string][] = [
  ['A', 'B'], ['A', 'C'],
  ['B', 'D'], ['B', 'E'],
  ['C', 'F'], ['C', 'G'],
]

// ─── BFS steps ───────────────────────────────────────────────────────────────

function buildBFSSteps(): Step[] {
  const steps: Step[] = []
  const adj: Record<string, string[]> = { A: ['B','C'], B: ['D','E'], C: ['F','G'], D: [], E: [], F: [], G: [] }
  const visited = new Set<string>()
  const queue = ['A']
  visited.add('A')
  steps.push({ description: 'Start: enqueue A, mark visited', highlight: new Set(['A']), visited: new Set(visited) })

  while (queue.length) {
    const node = queue.shift()!
    steps.push({ description: `Dequeue ${node} — explore neighbours`, highlight: new Set([node]), visited: new Set(visited) })
    for (const nb of adj[node]) {
      if (!visited.has(nb)) {
        visited.add(nb)
        queue.push(nb)
        steps.push({ description: `Enqueue ${nb} (reached from ${node})`, highlight: new Set([nb, node]), visited: new Set(visited) })
      }
    }
  }
  steps.push({ description: 'BFS complete — all nodes visited!', highlight: new Set(), visited: new Set(visited) })
  return steps
}

// ─── DFS steps ───────────────────────────────────────────────────────────────

function buildDFSSteps(): Step[] {
  const steps: Step[] = []
  const adj: Record<string, string[]> = { A: ['B','C'], B: ['D','E'], C: ['F','G'], D: [], E: [], F: [], G: [] }
  const visited = new Set<string>()
  const stack: Array<{ node: string; status: 'active' | 'returning' }> = []

  function snap(desc: string, highlight: Set<string>) {
    steps.push({
      description: desc,
      highlight,
      visited: new Set(visited),
      callStack: stack.map(f => ({ ...f })),
    })
  }

  function dfs(node: string, parent: string | null) {
    visited.add(node)
    stack.push({ node, status: 'active' })
    const desc = parent
      ? `dfs(${node}) called from ${parent} — frame pushed onto call stack`
      : `dfs(${node}) — first call, frame pushed onto call stack`
    snap(desc, new Set([node]))

    for (const nb of adj[node]) {
      if (!visited.has(nb)) {
        snap(`Checking neighbour ${nb} of ${node} — not yet visited, will recurse`, new Set([node, nb]))
        dfs(nb, node)
      } else {
        snap(`Neighbour ${nb} of ${node} already visited — skip`, new Set([node]))
      }
    }

    stack[stack.length - 1].status = 'returning'
    snap(`dfs(${node}) returns — frame popped, backtrack to ${parent ?? 'caller'}`, new Set([node]))
    stack.pop()
  }

  snap('Initial state — call stack empty, graph unexplored', new Set())
  dfs('A', null)
  snap('DFS complete — call stack is empty, every node visited', new Set())
  return steps
}

// ─── Bubble sort steps (accepts custom array) ────────────────────────────────

function buildBubbleSortSteps(input: number[]): Step[] {
  const steps: Step[] = []
  const a = [...input]
  steps.push({ description: `Initial array: [${a.join(', ')}]`, highlight: new Set(), visited: new Set(), array: [...a] })

  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < a.length - i - 1; j++) {
      steps.push({ description: `Compare a[${j}]=${a[j]} and a[${j+1}]=${a[j+1]}`, highlight: new Set([`${j}`,`${j+1}`]), visited: new Set(), comparing: [j, j+1], array: [...a] })
      if (a[j] > a[j+1]) {
        ;[a[j], a[j+1]] = [a[j+1], a[j]]
        steps.push({ description: `Swap → [${a.join(', ')}]`, highlight: new Set([`${j}`,`${j+1}`]), visited: new Set(), swap: [j, j+1], array: [...a] })
      }
    }
    steps.push({ description: `Pass ${i+1} done — ${a[a.length-1-i]} settled at end`, highlight: new Set(), visited: new Set([...Array(i+1).keys()].map(k=>`${a.length-1-k}`)), array: [...a] })
  }
  steps.push({ description: `Sorted: [${a.join(', ')}]`, highlight: new Set(), visited: new Set(Array.from({length: a.length}, (_,i) => `${i}`)), array: [...a] })
  return steps
}

// ─── Binary search steps (accepts custom sorted array + target) ──────────────

function buildBinarySearchSteps(input: number[], target: number): Step[] {
  const arr = [...input].sort((a, b) => a - b)
  const steps: Step[] = []
  let lo = 0, hi = arr.length - 1

  steps.push({ description: `Sorted array — searching for ${target}`, highlight: new Set(), visited: new Set(), array: [...arr] })

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    steps.push({ description: `lo=${lo} hi=${hi} → mid=${mid}, arr[mid]=${arr[mid]}`, highlight: new Set([`${mid}`]), visited: new Set([`${lo}`,`${hi}`]), array: [...arr] })
    if (arr[mid] === target) {
      steps.push({ description: `Found ${target} at index ${mid}!`, highlight: new Set(), visited: new Set(), found: mid, array: [...arr] })
      return steps
    } else if (arr[mid] < target) {
      steps.push({ description: `${arr[mid]} < ${target} → search right half`, highlight: new Set([`${mid}`]), visited: new Set(), array: [...arr] })
      lo = mid + 1
    } else {
      steps.push({ description: `${arr[mid]} > ${target} → search left half`, highlight: new Set([`${mid}`]), visited: new Set(), array: [...arr] })
      hi = mid - 1
    }
  }
  steps.push({ description: `${target} not found in array`, highlight: new Set(), visited: new Set(), array: [...arr] })
  return steps
}

// ─── Merge sort steps (accepts custom array) ─────────────────────────────────

function buildMergeSortSteps(input: number[]): Step[] {
  const arr = [...input]
  const steps: Step[] = []

  function mergeSort(a: number[], depth = 0): number[] {
    if (a.length <= 1) return a
    const mid = Math.floor(a.length / 2)
    const left = mergeSort(a.slice(0, mid), depth + 1)
    const right = mergeSort(a.slice(mid), depth + 1)
    steps.push({ description: `Merge [${left.join(',')}] + [${right.join(',')}] (depth ${depth})`, highlight: new Set(), visited: new Set() })
    const merged: number[] = []
    let i = 0, j = 0
    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) merged.push(left[i++])
      else merged.push(right[j++])
    }
    while (i < left.length) merged.push(left[i++])
    while (j < right.length) merged.push(right[j++])
    steps.push({ description: `→ [${merged.join(',')}]`, highlight: new Set(), visited: new Set(), array: [...merged] })
    return merged
  }

  steps.push({ description: `Input: [${arr.join(', ')}] — divide and conquer: split into halves recursively`, highlight: new Set(), visited: new Set(), array: [...arr] })
  const sorted = mergeSort(arr)
  steps.push({ description: `Sorted! [${sorted.join(', ')}] — Merge Sort is O(n log n) — stable, predictable`, highlight: new Set(), visited: new Set(), array: sorted })
  return steps
}

// ─── Quick sort steps (accepts custom array) ─────────────────────────────────

function buildQuickSortSteps(input: number[]): Step[] {
  const a = [...input]
  const steps: Step[] = []

  function quickSort(lo: number, hi: number): void {
    if (lo >= hi) return
    const pivot = a[hi]
    steps.push({ description: `Pivot = ${pivot} (index ${hi}), partition [${lo}..${hi}]`, highlight: new Set([`${hi}`]), visited: new Set(), array: [...a] })
    let i = lo - 1
    for (let j = lo; j < hi; j++) {
      if (a[j] <= pivot) {
        i++
        ;[a[i], a[j]] = [a[j], a[i]]
        steps.push({ description: `${a[j]} ≤ ${pivot} → swap a[${i}] and a[${j}]: [${a.join(',')}]`, highlight: new Set([`${i}`,`${j}`]), visited: new Set(), array: [...a] })
      }
    }
    ;[a[i+1], a[hi]] = [a[hi], a[i+1]]
    steps.push({ description: `Place pivot ${pivot} at index ${i+1}: [${a.join(',')}]`, highlight: new Set([`${i+1}`]), visited: new Set(), array: [...a] })
    quickSort(lo, i)
    quickSort(i+2, hi)
  }

  steps.push({ description: `Input: [${a.join(', ')}] — pick pivot, partition, recurse`, highlight: new Set(), visited: new Set(), array: [...a] })
  quickSort(0, a.length - 1)
  steps.push({ description: `Sorted: [${a.join(', ')}] — Quick Sort avg O(n log n)`, highlight: new Set(), visited: new Set(Array.from({length: a.length}, (_, i) => `${i}`)), array: [...a] })
  return steps
}

// ─── Stack steps ─────────────────────────────────────────────────────────────

function buildStackSteps(): Step[] {
  const ops: Array<{ op: 'push' | 'pop'; val?: number }> = [
    { op: 'push', val: 10 }, { op: 'push', val: 20 }, { op: 'push', val: 30 },
    { op: 'pop' }, { op: 'push', val: 40 }, { op: 'pop' }, { op: 'pop' },
  ]
  const steps: Step[] = []
  const stack: number[] = []

  steps.push({ description: 'Empty stack — LIFO: Last In, First Out', highlight: new Set(), visited: new Set() })

  for (const { op, val } of ops) {
    if (op === 'push' && val !== undefined) {
      stack.push(val)
      steps.push({ description: `PUSH ${val} → top is now ${stack[stack.length-1]}. Stack: [${stack.join(', ')}]`, highlight: new Set([`${stack.length-1}`]), visited: new Set() })
    } else if (op === 'pop') {
      const popped = stack.pop()
      steps.push({ description: `POP → removed ${popped}. Stack: [${stack.join(', ')}]`, highlight: new Set(), visited: new Set() })
    }
  }
  return steps
}

// ─── Queue steps ─────────────────────────────────────────────────────────────

function buildQueueSteps(): Step[] {
  const ops: Array<{ op: 'enqueue' | 'dequeue'; val?: number }> = [
    { op: 'enqueue', val: 10 }, { op: 'enqueue', val: 20 }, { op: 'enqueue', val: 30 },
    { op: 'dequeue' }, { op: 'enqueue', val: 40 }, { op: 'dequeue' }, { op: 'dequeue' },
  ]
  const steps: Step[] = []
  const queue: number[] = []

  steps.push({ description: 'Empty queue — FIFO: First In, First Out', highlight: new Set(), visited: new Set() })

  for (const { op, val } of ops) {
    if (op === 'enqueue' && val !== undefined) {
      queue.push(val)
      steps.push({ description: `ENQUEUE ${val} → rear is ${queue[queue.length-1]}. Queue: [${queue.join(' → ')}]`, highlight: new Set([`${queue.length-1}`]), visited: new Set() })
    } else if (op === 'dequeue') {
      const front = queue.shift()
      steps.push({ description: `DEQUEUE → removed ${front} from front. Queue: [${queue.join(' → ')}]`, highlight: new Set(), visited: new Set() })
    }
  }
  return steps
}

// ─── Linked list steps ───────────────────────────────────────────────────────

function buildLinkedListSteps(input: number[]): Step[] {
  const steps: Step[] = []
  const nodes = input.slice(0, 8) // cap at 8 for readability
  steps.push({ description: 'Linked list — each node holds a value and a pointer to the next node', highlight: new Set(), visited: new Set() })
  for (let i = 0; i < nodes.length; i++) {
    steps.push({ description: `Traverse to node ${i+1}: value=${nodes[i]}${i < nodes.length-1 ? ` → next=${nodes[i+1]}` : ' → next=NULL (tail)'}`, highlight: new Set([`${i}`]), visited: new Set(Array.from({length:i+1},(_,k)=>`${k}`)) })
  }
  steps.push({ description: 'Traversal complete — O(n) time, O(1) space per step', highlight: new Set(), visited: new Set(nodes.map((_,i)=>`${i}`)) })
  return steps
}

// ─── Binary Tree steps ───────────────────────────────────────────────────────

function buildBinaryTreeSteps(): Step[] {
  const steps: Step[] = []
  const insertValues = [50, 30, 70, 20, 40, 60, 80]
  const tree: Record<string, { left?: string; right?: string; val: number }> = {}

  function insert(val: number) {
    const id = `n${val}`
    if (!tree['n50']) {
      tree[id] = { val }
      steps.push({ description: `Insert ${val} as ROOT`, highlight: new Set([id]), visited: new Set(Object.keys(tree)) })
      return
    }
    let cur = 'n50'
    while (true) {
      if (val < tree[cur].val) {
        if (!tree[cur].left) { tree[cur].left = id; tree[id] = { val }; steps.push({ description: `${val} < ${tree[cur].val} → insert LEFT of ${tree[cur].val}`, highlight: new Set([id, cur]), visited: new Set(Object.keys(tree)) }); break }
        steps.push({ description: `${val} < ${tree[cur].val} → go LEFT`, highlight: new Set([cur]), visited: new Set(Object.keys(tree)) })
        cur = tree[cur].left!
      } else {
        if (!tree[cur].right) { tree[cur].right = id; tree[id] = { val }; steps.push({ description: `${val} > ${tree[cur].val} → insert RIGHT of ${tree[cur].val}`, highlight: new Set([id, cur]), visited: new Set(Object.keys(tree)) }); break }
        steps.push({ description: `${val} > ${tree[cur].val} → go RIGHT`, highlight: new Set([cur]), visited: new Set(Object.keys(tree)) })
        cur = tree[cur].right!
      }
    }
  }

  for (const v of insertValues) insert(v)
  steps.push({ description: 'BST built — left < parent < right invariant holds at every node', highlight: new Set(), visited: new Set(Object.keys(tree)) })
  return steps
}

// ─── Hash table steps ────────────────────────────────────────────────────────

function buildHashTableSteps(): Step[] {
  const SIZE = 7
  const table: (number | null)[] = Array(SIZE).fill(null)
  const keys = [15, 11, 27, 8, 13, 34, 20]
  const steps: Step[] = []

  steps.push({ description: `Hash table of size ${SIZE}. Hash function: key % ${SIZE}`, highlight: new Set(), visited: new Set() })

  for (const key of keys) {
    const idx = key % SIZE
    if (table[idx] === null) {
      table[idx] = key
      steps.push({ description: `Insert ${key} → hash(${key}) = ${key}%${SIZE} = ${idx} → slot ${idx} is free`, highlight: new Set([`${idx}`]), visited: new Set() })
    } else {
      const orig = idx
      let probe = idx
      while (table[probe] !== null) {
        steps.push({ description: `Collision at slot ${probe} (has ${table[probe]}) — linear probe: try ${(probe+1)%SIZE}`, highlight: new Set([`${probe}`]), visited: new Set() })
        probe = (probe + 1) % SIZE
      }
      table[probe] = key
      steps.push({ description: `Insert ${key} at slot ${probe} (after probing from ${orig})`, highlight: new Set([`${probe}`]), visited: new Set() })
    }
  }
  steps.push({ description: 'Hash table filled — average O(1) lookup', highlight: new Set(), visited: new Set() })
  return steps
}

// ─── Dijkstra steps ──────────────────────────────────────────────────────────

function buildDijkstraSteps(): Step[] {
  const steps: Step[] = []
  const graph: Record<string, Record<string, number>> = {
    A: { B: 4, C: 2 },
    B: { D: 3, E: 1 },
    C: { B: 1, F: 5 },
    D: { G: 2 },
    E: { G: 4 },
    F: { G: 1 },
    G: {},
  }
  const INF = 9999
  const dist: Record<string, number> = {}
  const prev: Record<string, string | null> = {}
  const unvisited = new Set(Object.keys(graph))

  for (const n of unvisited) { dist[n] = INF; prev[n] = null }
  dist['A'] = 0
  steps.push({ description: 'Init: dist[A]=0, all others=∞', highlight: new Set(['A']), visited: new Set() })

  while (unvisited.size) {
    const u = [...unvisited].reduce((a, b) => dist[a] < dist[b] ? a : b)
    unvisited.delete(u)
    steps.push({ description: `Visit ${u} (dist=${dist[u]}) — closest unvisited node`, highlight: new Set([u]), visited: new Set(Object.keys(graph).filter(n => !unvisited.has(n))) })

    for (const [nb, w] of Object.entries(graph[u])) {
      if (!unvisited.has(nb)) continue
      const alt = dist[u] + w
      if (alt < dist[nb]) {
        dist[nb] = alt
        prev[nb] = u
        steps.push({ description: `Relax edge ${u}→${nb}: dist=${alt} (via ${u})`, highlight: new Set([u, nb]), visited: new Set(Object.keys(graph).filter(n => !unvisited.has(n))) })
      }
    }
  }
  steps.push({ description: `Done! Shortest distances from A: ${Object.entries(dist).map(([k,v])=>`${k}=${v}`).join(', ')}`, highlight: new Set(), visited: new Set(Object.keys(graph)) })
  return steps
}

// ─── Step builder ─────────────────────────────────────────────────────────────

interface BuildConfig {
  array: number[]
  searchTarget: number
}

function buildSteps(type: AlgoType, cfg: BuildConfig): Step[] {
  switch (type) {
    case 'bfs':          return buildBFSSteps()
    case 'dfs':          return buildDFSSteps()
    case 'bubble_sort':  return buildBubbleSortSteps(cfg.array)
    case 'merge_sort':   return buildMergeSortSteps(cfg.array)
    case 'quick_sort':   return buildQuickSortSteps(cfg.array)
    case 'binary_search':return buildBinarySearchSteps(cfg.array, cfg.searchTarget)
    case 'binary_tree':  return buildBinaryTreeSteps()
    case 'linked_list':  return buildLinkedListSteps(cfg.array)
    case 'stack':        return buildStackSteps()
    case 'queue':        return buildQueueSteps()
    case 'dijkstra':     return buildDijkstraSteps()
    case 'hash_table':   return buildHashTableSteps()
    default:             return []
  }
}

// ─── Sub-renderers ────────────────────────────────────────────────────────────

/** CS50-style bar chart for sorting/searching — uses live array snapshot per step */
function BarViz({ step, type, accent, baseArray }: { step: Step; type: AlgoType; accent: string; baseArray: number[] }) {
  // Use the snapshot carried in the step if available, otherwise fall back
  const arr = step.array ?? baseArray
  const maxVal = Math.max(...arr, 1)
  const n = arr.length
  const SVG_H = 200
  const BAR_AREA_H = 150
  const GAP = n > 12 ? 2 : 3
  const BAR_W = Math.max(8, Math.floor((480 - (n + 1) * GAP) / n))
  const SVG_W = n * (BAR_W + GAP) + GAP + 20

  return (
    <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ display: 'block' }}>
      {arr.map((v, i) => {
        const barH = Math.max(4, (v / maxVal) * BAR_AREA_H)
        const x = GAP + i * (BAR_W + GAP)
        const y = BAR_AREA_H - barH + 10
        const isHL = step.highlight.has(`${i}`)
        const isDone = step.visited.has(`${i}`)
        const found = step.found === i
        const isSorted = type === 'bubble_sort' || type === 'merge_sort' || type === 'quick_sort'
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={BAR_W} height={barH}
              rx={Math.min(3, BAR_W / 4)}
              fill={found ? '#22c55e' : isHL ? accent : (isSorted && isDone) ? `${accent}88` : 'var(--surface-2)'}
              stroke={isHL || found ? accent : isDone ? `${accent}66` : '#444'}
              strokeWidth={isHL || found ? 2 : 1}
              style={{ transition: 'fill 0.18s, y 0.18s, height 0.18s' }}
            />
            {/* Value label on top of bar — only show if bars are wide enough */}
            {BAR_W >= 22 && (
              <text x={x + BAR_W / 2} y={y - 3} textAnchor="middle" fontSize="9" fill="var(--muted)">{v}</text>
            )}
            {/* Index label below */}
            {BAR_W >= 16 && (
              <text x={x + BAR_W / 2} y={BAR_AREA_H + 22} textAnchor="middle" fontSize="9" fill="var(--muted)">{i}</text>
            )}
          </g>
        )
      })}
      {/* Baseline */}
      <line x1={GAP} y1={BAR_AREA_H + 10} x2={SVG_W - 10} y2={BAR_AREA_H + 10} stroke="#444" strokeWidth="1" />
    </svg>
  )
}

function GraphViz({ step, accent }: { step: Step; accent: string }) {
  return (
    <svg width="100%" viewBox="0 0 490 270" style={{ display: 'block' }}>
      {GRAPH_EDGES.map(([a, b]) => {
        const na = GRAPH_NODES[a], nb = GRAPH_NODES[b]
        const inPath = step.path?.includes(a) && step.path?.includes(b)
        return (
          <line key={`${a}-${b}`}
            x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
            stroke={inPath ? accent : '#444'}
            strokeWidth={inPath ? 3 : 1.5}
            strokeDasharray={inPath ? 'none' : '4 2'}
          />
        )
      })}
      {Object.entries(GRAPH_NODES).map(([id, { x, y }]) => {
        const isHighlight = step.highlight.has(id)
        const isVisited   = step.visited.has(id)
        return (
          <g key={id}>
            <circle
              cx={x} cy={y} r={22}
              fill={isHighlight ? accent : isVisited ? `${accent}55` : 'var(--surface-2)'}
              stroke={isHighlight ? accent : isVisited ? accent : '#555'}
              strokeWidth={isHighlight ? 3 : 1.5}
              style={{ transition: 'fill 0.3s, stroke 0.3s' }}
            />
            <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="700"
              fill={isHighlight ? '#fff' : isVisited ? accent : 'var(--text)'}>
              {id}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function StackQueueViz({ step, type, accent }: { step: Step; type: AlgoType; accent: string }) {
  const match = step.description.match(/\[([\d, →]+)\]/)
  const items: string[] = match ? match[1].split(/[,→]+/).map(s => s.trim()).filter(Boolean) : []
  const isStack = type === 'stack'
  const W = 64, H = 44, GAP = 6
  const MAX_SHOWN = 6
  const shown = isStack ? [...items].reverse().slice(0, MAX_SHOWN) : items.slice(0, MAX_SHOWN)

  return (
    <svg width="100%" viewBox={`0 0 200 ${(MAX_SHOWN) * (H + GAP) + 60}`} style={{ display: 'block' }}>
      <text x="100" y="22" textAnchor="middle" fontSize="12" fill="var(--muted)">{isStack ? '↑ TOP' : 'FRONT →'}</text>
      {shown.map((val, i) => {
        const isFirst = i === 0
        const x = 68, y = 30 + i * (H + GAP)
        return (
          <g key={i}>
            <rect x={x} y={y} width={W} height={H} rx={6}
              fill={isFirst ? accent : 'var(--surface-2)'}
              stroke={isFirst ? accent : '#555'} strokeWidth={isFirst ? 2.5 : 1.5}
              style={{ transition: 'fill 0.3s' }}
            />
            <text x={x + W/2} y={y + H/2 + 5} textAnchor="middle" fontSize="15" fontWeight="700"
              fill={isFirst ? '#fff' : 'var(--text)'}>
              {val}
            </text>
          </g>
        )
      })}
      {items.length === 0 && (
        <text x="100" y={60} textAnchor="middle" fontSize="13" fill="var(--muted)" fontStyle="italic">empty</text>
      )}
      <text x="100" y={30 + MAX_SHOWN * (H + GAP) + 20} textAnchor="middle" fontSize="12" fill="var(--muted)">{isStack ? '↓ BOTTOM' : '← REAR'}</text>
    </svg>
  )
}

function LinkedListViz({ step, accent, nodes }: { step: Step; accent: string; nodes: number[] }) {
  const list = nodes.slice(0, 8)
  const W = 60, H = 40, ARROW = 30, PAD = 16

  return (
    <svg width="100%" viewBox={`0 0 ${list.length * (W + ARROW) + PAD * 2} ${H + 60}`} style={{ display: 'block' }}>
      {list.map((val, i) => {
        const x = PAD + i * (W + ARROW)
        const cy = H / 2 + 20
        const isHL = step.highlight.has(`${i}`)
        const isVis = step.visited.has(`${i}`)
        return (
          <g key={i}>
            <rect x={x} y={20} width={W} height={H} rx={6}
              fill={isHL ? accent : isVis ? `${accent}55` : 'var(--surface-2)'}
              stroke={isHL ? accent : '#555'} strokeWidth={isHL ? 2.5 : 1.5}
              style={{ transition: 'fill 0.3s' }}
            />
            <text x={x + W/2} y={20 + H/2 + 5} textAnchor="middle" fontSize="14" fontWeight="700"
              fill={isHL ? '#fff' : 'var(--text)'}>{val}</text>
            {i < list.length - 1 ? (
              <>
                <line x1={x + W} y1={cy} x2={x + W + ARROW - 4} y2={cy} stroke="#888" strokeWidth="1.5" markerEnd="url(#arrow)" />
                <text x={x + W + ARROW / 2} y={cy - 6} textAnchor="middle" fontSize="9" fill="var(--muted)">*next</text>
              </>
            ) : (
              <text x={x + W/2} y={H + 48} textAnchor="middle" fontSize="10" fill="var(--muted)">NULL</text>
            )}
          </g>
        )
      })}
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#888" />
        </marker>
      </defs>
    </svg>
  )
}

function HashTableViz({ step, accent }: { step: Step; accent: string }) {
  const SIZE = 7
  const hlIdx = step.highlight.size ? parseInt([...step.highlight][0]) : -1

  return (
    <svg width="100%" viewBox="0 0 300 320" style={{ display: 'block' }}>
      {Array.from({ length: SIZE }, (_, i) => {
        const y = 20 + i * 40
        const isHL = i === hlIdx
        return (
          <g key={i}>
            <rect x={80} y={y} width={140} height={32} rx={4}
              fill={isHL ? accent : 'var(--surface-2)'}
              stroke={isHL ? accent : '#555'} strokeWidth={isHL ? 2.5 : 1.5}
              style={{ transition: 'fill 0.3s' }}
            />
            <text x={66} y={y + 20} textAnchor="end" fontSize="12" fill="var(--muted)">[{i}]</text>
            <text x={150} y={y + 20} textAnchor="middle" fontSize="13" fontWeight="600"
              fill={isHL ? '#fff' : 'var(--muted)'}>
              {isHL ? '← here' : ''}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function BinaryTreeViz({ step, accent }: { step: Step; accent: string }) {
  const positions: Record<string, { x: number; y: number }> = {
    n50: { x: 240, y: 30 },
    n30: { x: 130, y: 100 }, n70: { x: 350, y: 100 },
    n20: { x: 75, y: 175 },  n40: { x: 185, y: 175 },
    n60: { x: 295, y: 175 }, n80: { x: 405, y: 175 },
  }
  const edges: [string, string][] = [
    ['n50','n30'],['n50','n70'],
    ['n30','n20'],['n30','n40'],
    ['n70','n60'],['n70','n80'],
  ]

  return (
    <svg width="100%" viewBox="0 0 490 240" style={{ display: 'block' }}>
      {edges.map(([a, b]) => {
        const pa = positions[a], pb = positions[b]
        return <line key={`${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#555" strokeWidth="1.5" />
      })}
      {Object.entries(positions).map(([id, { x, y }]) => {
        const isHL = step.highlight.has(id)
        const isVis = step.visited.has(id)
        const val = id.replace('n', '')
        return (
          <g key={id}>
            <circle cx={x} cy={y} r={22}
              fill={isHL ? accent : isVis ? `${accent}55` : 'var(--surface-2)'}
              stroke={isHL ? accent : isVis ? accent : '#555'}
              strokeWidth={isHL ? 3 : 1.5}
              style={{ transition: 'fill 0.3s' }}
            />
            <text x={x} y={y + 5} textAnchor="middle" fontSize="13" fontWeight="700"
              fill={isHL ? '#fff' : isVis ? accent : 'var(--text)'}>
              {val}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function DFSViz({ step, accent }: { step: Step; accent: string }) {
  const frames = step.callStack ?? []
  const FRAME_H = 38
  const FRAME_W = 90
  const FRAME_GAP = 6
  const MAX_FRAMES = 7
  const shown = frames.slice(-MAX_FRAMES)

  return (
    <div style={{ display: 'flex', gap: '1rem', width: '100%', alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 55%', minWidth: 0 }}>
        <GraphViz step={step} accent={accent} />
      </div>
      <div style={{ flex: '0 0 160px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Call Stack
        </div>
        <svg width={FRAME_W + 30} height={MAX_FRAMES * (FRAME_H + FRAME_GAP) + 30} style={{ display: 'block', overflow: 'visible' }}>
          <text x={(FRAME_W + 30) / 2} y={14} textAnchor="middle" fontSize="10" fill="var(--muted)">▲ TOP</text>
          {shown.length === 0 && (
            <text x={(FRAME_W + 30) / 2} y={MAX_FRAMES * (FRAME_H + FRAME_GAP) / 2 + 20}
              textAnchor="middle" fontSize="12" fill="var(--muted)" fontStyle="italic">empty</text>
          )}
          {[...shown].reverse().map((frame, revIdx) => {
            const visualIdx = revIdx
            const y = 20 + visualIdx * (FRAME_H + FRAME_GAP)
            const isTop = visualIdx === 0
            const isReturning = frame.status === 'returning'
            const frameAccent = isReturning ? '#ef4444' : accent
            return (
              <g key={`${frame.node}-${revIdx}`}>
                <rect
                  x={15} y={y} width={FRAME_W} height={FRAME_H} rx={6}
                  fill={isTop ? `${frameAccent}25` : 'var(--surface-2)'}
                  stroke={isTop ? frameAccent : '#555'}
                  strokeWidth={isTop ? 2.5 : 1.5}
                  style={{ transition: 'fill 0.3s, stroke 0.3s' }}
                />
                <text x={15 + FRAME_W / 2} y={y + 15} textAnchor="middle" fontSize="11" fontWeight="700"
                  fill={isTop ? frameAccent : 'var(--text)'}>
                  dfs({frame.node})
                </text>
                <text x={15 + FRAME_W / 2} y={y + 28} textAnchor="middle" fontSize="9"
                  fill={isReturning ? '#ef4444' : 'var(--muted)'}>
                  {isReturning ? '↩ returning' : '⏳ executing'}
                </text>
                <text x={10} y={y + FRAME_H / 2 + 4} textAnchor="end" fontSize="9" fill="var(--muted)">
                  {shown.length - 1 - revIdx}
                </text>
              </g>
            )
          })}
          <text x={(FRAME_W + 30) / 2} y={20 + MAX_FRAMES * (FRAME_H + FRAME_GAP) + 10}
            textAnchor="middle" fontSize="10" fill="var(--muted)">▼ BOTTOM</text>
        </svg>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '4px', textAlign: 'center' }}>
          depth: {frames.length}
        </div>
      </div>
    </div>
  )
}

// ─── Array algo types ─────────────────────────────────────────────────────────

const ARRAY_ALGOS = new Set<AlgoType>(['bubble_sort', 'merge_sort', 'quick_sort', 'binary_search', 'linked_list'])

function renderViz(type: AlgoType, step: Step, accent: string, baseArray: number[]) {
  if (type === 'dfs') return <DFSViz step={step} accent={accent} />
  if (type === 'bfs' || type === 'dijkstra') return <GraphViz step={step} accent={accent} />
  if (type === 'bubble_sort' || type === 'binary_search' || type === 'merge_sort' || type === 'quick_sort') {
    return <BarViz step={step} type={type} accent={accent} baseArray={baseArray} />
  }
  if (type === 'stack' || type === 'queue') return <StackQueueViz step={step} type={type} accent={accent} />
  if (type === 'linked_list') return <LinkedListViz step={step} accent={accent} nodes={baseArray} />
  if (type === 'binary_tree') return <BinaryTreeViz step={step} accent={accent} />
  if (type === 'hash_table') return <HashTableViz step={step} accent={accent} />
  return null
}

// ─── Speed tiers ─────────────────────────────────────────────────────────────

const SPEED_PRESETS = [
  { label: '0.5×', ms: 1800 },
  { label: '1×',   ms: 900  },
  { label: '2×',   ms: 450  },
  { label: '4×',   ms: 200  },
  { label: '8×',   ms: 80   },
]

// ─── Category dot colours ────────────────────────────────────────────────────

const CAT_COLOUR: Record<string, string> = {
  algo: '#6366f1', physics: '#f59e0b', math: '#22c55e', chemistry: '#ec4899',
}

// ─── Single-algo inner panel (renamed, same logic) ───────────────────────────

interface PanelProps { algoType: AlgoType; resolvedAccent: string; mode: Mode }

function AlgoPanel({ algoType, resolvedAccent, mode }: PanelProps) {
  const isArrayAlgo = ARRAY_ALGOS.has(algoType)

  // ── Custom array input state ───────────────────────────────────────────────
  const DEFAULT_LEN = 9
  const [arrayInput, setArrayInput] = useState<string>(() => randomArray(DEFAULT_LEN).join(', '))
  const [inputError, setInputError] = useState<string>('')
  const [searchTarget, setSearchTarget] = useState<number>(22)
  const [showInputPanel, setShowInputPanel] = useState(false)

  /** Parse the current text input into a validated number array. */
  const parseInput = (raw: string): number[] | null => {
    const parts = raw.split(/[\s,]+/).map(s => s.trim()).filter(Boolean)
    if (parts.length < 2) return null
    const nums = parts.map(Number)
    if (nums.some(isNaN)) return null
    return nums.map(n => clamp(Math.round(n), 1, 999))
  }

  // ── Build steps from current input ────────────────────────────────────────
  const [baseArray, setBaseArray] = useState<number[]>(() => {
    const parsed = parseInput(arrayInput)
    return parsed ?? randomArray(DEFAULT_LEN)
  })

  const buildConfig: BuildConfig = { array: baseArray, searchTarget }
  const [steps, setSteps] = useState<Step[]>(() => buildSteps(algoType, buildConfig))
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speedIdx, setSpeedIdx] = useState(1) // default 1× = 900ms
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const step = steps[idx] ?? steps[0]

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setPlaying(false)
  }, [])

  const play = useCallback(() => {
    if (idx >= steps.length - 1) setIdx(0)
    setPlaying(true)
    intervalRef.current = setInterval(() => {
      setIdx(prev => {
        if (prev >= steps.length - 1) { stop(); return prev }
        return prev + 1
      })
    }, SPEED_PRESETS[speedIdx].ms)
  }, [idx, steps.length, stop, speedIdx])

  // Re-create interval when speed changes while playing
  useEffect(() => {
    if (!playing) return
    stop()
    intervalRef.current = setInterval(() => {
      setIdx(prev => {
        if (prev >= steps.length - 1) { stop(); return prev }
        return prev + 1
      })
    }, SPEED_PRESETS[speedIdx].ms)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speedIdx])

  useEffect(() => { return stop }, [stop])

  const prev = () => { stop(); setIdx(i => Math.max(0, i - 1)) }
  const next = () => { stop(); setIdx(i => Math.min(steps.length - 1, i + 1)) }
  const reset = () => { stop(); setIdx(0) }

  /** Randomize the input array and rebuild steps */
  const randomize = () => {
    const newArr = randomArray(DEFAULT_LEN)
    const newInput = newArr.join(', ')
    setArrayInput(newInput)
    setInputError('')
    setBaseArray(newArr)
    const newTarget = newArr[Math.floor(newArr.length / 2)]
    setSearchTarget(newTarget)
    const newSteps = buildSteps(algoType, { array: newArr, searchTarget: newTarget })
    setSteps(newSteps)
    stop()
    setIdx(0)
  }

  /** Apply manually typed array */
  const applyInput = () => {
    const parsed = parseInput(arrayInput)
    if (!parsed) { setInputError('Enter at least 2 comma-separated numbers (e.g. 42, 17, 88)'); return }
    setInputError('')
    setBaseArray(parsed)
    const newSteps = buildSteps(algoType, { array: parsed, searchTarget })
    setSteps(newSteps)
    stop()
    setIdx(0)
    setShowInputPanel(false)
  }

  const btnBase: React.CSSProperties = {
    padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.82rem', cursor: 'pointer',
    border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)',
    fontWeight: 500, transition: 'opacity 0.15s',
  }

  return (
    <div style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0.6rem 0.9rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--muted)', flex: 1 }}>
          ⬡ {ALGO_LABELS[algoType]}
          <span style={{ marginLeft: '0.4rem', fontSize: '0.66rem', padding: '0.08rem 0.4rem', borderRadius: '6px',
            background: `${CAT_COLOUR[VIZ_CATEGORY[algoType]]}22`,
            border: `1px solid ${CAT_COLOUR[VIZ_CATEGORY[algoType]]}55`,
            color: CAT_COLOUR[VIZ_CATEGORY[algoType]], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {VIZ_CATEGORY[algoType]}
          </span>
        </span>
        {isArrayAlgo && (
          <button
            style={{ ...btnBase, padding: '0.2rem 0.6rem', fontSize: '0.74rem' }}
            onClick={randomize}
            title="Shuffle with a new random array"
          >
            🔀 Shuffle
          </button>
        )}
        {isArrayAlgo && (
          <button
            style={{ ...btnBase, padding: '0.2rem 0.6rem', fontSize: '0.74rem', borderColor: showInputPanel ? resolvedAccent : undefined, color: showInputPanel ? resolvedAccent : undefined }}
            onClick={() => setShowInputPanel(p => !p)}
            title="Enter your own array"
          >
            ✏️ Custom
          </button>
        )}
        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
          step {idx + 1} / {steps.length}
        </span>
      </div>

      {/* Custom input panel */}
      {showInputPanel && isArrayAlgo && (
        <div style={{ padding: '0.6rem 0.9rem', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>
              Array (comma-separated numbers)
            </label>
            <input
              value={arrayInput}
              onChange={e => setArrayInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyInput()}
              placeholder="e.g. 42, 17, 88, 5, 61"
              style={{
                width: '100%', padding: '0.35rem 0.6rem', borderRadius: '6px',
                border: `1px solid ${inputError ? '#ef4444' : 'var(--border)'}`,
                background: 'var(--surface)', color: 'var(--text)', fontSize: '0.84rem',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            {inputError && <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem' }}>{inputError}</div>}
          </div>
          {algoType === 'binary_search' && (
            <div style={{ flex: '0 0 100px' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>
                Search target
              </label>
              <input
                type="number"
                value={searchTarget}
                onChange={e => setSearchTarget(Number(e.target.value))}
                style={{
                  width: '100%', padding: '0.35rem 0.6rem', borderRadius: '6px',
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--text)', fontSize: '0.84rem', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          )}
          <button
            onClick={applyInput}
            style={{ ...btnBase, background: resolvedAccent, color: '#fff', border: `1px solid ${resolvedAccent}`, padding: '0.35rem 0.9rem' }}
          >
            Apply
          </button>
        </div>
      )}

      {/* SVG canvas */}
      <div style={{ background: 'var(--bg)', padding: '1rem 0.5rem 0.5rem', minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {renderViz(algoType, step, resolvedAccent, baseArray)}
      </div>

      {/* Step description */}
      <div style={{
        padding: '0.65rem 1rem',
        background: `${resolvedAccent}15`,
        borderTop: `1px solid ${resolvedAccent}44`,
        borderBottom: '1px solid var(--border)',
        fontSize: '0.88rem',
        lineHeight: 1.5,
        minHeight: '3rem',
        color: 'var(--text)',
      }}>
        {step.description}
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'var(--surface-2)' }}>
        <div style={{ height: '100%', background: resolvedAccent, width: `${(idx / (steps.length - 1)) * 100}%`, transition: 'width 0.3s' }} />
      </div>

      {/* Controls */}
      <div style={{ padding: '0.65rem 0.9rem', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--surface)', flexWrap: 'wrap' }}>
        <button style={btnBase} onClick={reset}>⟳</button>
        <button style={btnBase} onClick={prev} disabled={idx === 0}>← Prev</button>
        {playing
          ? <button style={{ ...btnBase, background: resolvedAccent, color: '#fff', border: `1px solid ${resolvedAccent}` }} onClick={stop}>⏸ Pause</button>
          : <button style={{ ...btnBase, background: resolvedAccent, color: '#fff', border: `1px solid ${resolvedAccent}` }} onClick={play} disabled={idx === steps.length - 1}>▶ Play</button>
        }
        <button style={btnBase} onClick={next} disabled={idx === steps.length - 1}>Next →</button>

        {/* Speed selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginLeft: '0.4rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Speed:</span>
          {SPEED_PRESETS.map((sp, i) => (
            <button
              key={sp.label}
              onClick={() => { setSpeedIdx(i) }}
              style={{
                padding: '0.18rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer',
                border: `1px solid ${i === speedIdx ? resolvedAccent : 'var(--border)'}`,
                background: i === speedIdx ? `${resolvedAccent}22` : 'var(--surface-2)',
                color: i === speedIdx ? resolvedAccent : 'var(--muted)',
                fontWeight: i === speedIdx ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              {sp.label}
            </button>
          ))}
        </div>

        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted)' }}>
          {steps.length} steps
        </span>
      </div>
    </div>
  )
}

// ─── Multi-algo wrapper (public default export) ───────────────────────────────

interface Props {
  algoType: AlgoType        // primary (shown when algoTypes has 1 entry or is omitted)
  algoTypes?: AlgoType[]    // when >1, renders a tab bar
  mode: Mode
}

export default function AlgoVisualizer({ algoType, algoTypes, mode }: Props) {
  const theme = THEMES[mode]
  const accent = theme.accent.startsWith('var(') ? undefined : theme.accent
  const resolvedAccent = accent ?? (mode === 'kids' ? '#f59e0b' : mode === 'researcher' ? '#14b8a6' : '#6366f1')

  // Deduplicated ordered list of types to display
  const types: AlgoType[] = algoTypes && algoTypes.length > 1
    ? Array.from(new Set(algoTypes))
    : [algoType]

  const [activeTab, setActiveTab] = useState(0)

  // Reset tab when the type list changes (new prompt submitted)
  const typesKey = types.join(',')
  const prevKeyRef = useRef(typesKey)
  useEffect(() => {
    if (prevKeyRef.current !== typesKey) {
      prevKeyRef.current = typesKey
      setActiveTab(0)
    }
  }, [typesKey])

  const active = types[activeTab] ?? algoType
  const showTabs = types.length > 1

  return (
    <div className="card" style={{ borderColor: resolvedAccent, padding: 0, overflow: 'hidden' }}>
      {/* Tab bar — only rendered when multiple algorithms detected */}
      {showTabs && (
        <div style={{
          display: 'flex', alignItems: 'stretch', background: 'var(--surface)',
          borderBottom: '1px solid var(--border)', overflowX: 'auto',
        }}>
          <span style={{ padding: '0 0.75rem', display: 'flex', alignItems: 'center',
            fontSize: '0.7rem', color: 'var(--muted)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border)' }}>
            Compare ({types.length})
          </span>
          {types.map((t, i) => {
            const col = CAT_COLOUR[VIZ_CATEGORY[t]]
            const isActive = i === activeTab
            return (
              <button key={t} onClick={() => setActiveTab(i)} style={{
                padding: '0.5rem 0.9rem', border: 'none', borderBottom: isActive ? `2.5px solid ${resolvedAccent}` : '2.5px solid transparent',
                background: 'transparent', color: isActive ? resolvedAccent : 'var(--muted)',
                fontWeight: isActive ? 700 : 400, fontSize: '0.8rem', cursor: 'pointer',
                fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'color 0.15s',
                display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: col, display: 'inline-block', flexShrink: 0 }} />
                {ALGO_LABELS[t]}
              </button>
            )
          })}
        </div>
      )}

      {/* Active panel */}
      <AlgoPanel key={active} algoType={active} resolvedAccent={resolvedAccent} mode={mode} />
    </div>
  )
}
