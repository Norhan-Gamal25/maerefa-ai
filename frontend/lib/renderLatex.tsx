'use client'

/**
 * Utilities for rendering text that may contain LaTeX expressions.
 *
 * Supports two modes of LaTeX delimiters that LLMs commonly emit:
 *   - Inline:  $...$  or  \(...\)
 *   - Display: $$...$$ or  \[...\]
 *
 * Falls back to plain text on any KaTeX parse error so the page never breaks.
 */
import React from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

/** Render a single LaTeX string to HTML using KaTeX. Returns null on error. */
function katexToHtml(source: string, display: boolean): string | null {
  try {
    return katex.renderToString(source, {
      displayMode: display,
      throwOnError: false,
      strict: false,
    })
  } catch {
    return null
  }
}

/**
 * Check whether a string contains any LaTeX delimiters.
 * Avoids running the expensive split on plain-text strings.
 */
export function hasLatex(text: string): boolean {
  // Only trigger on actual math delimiters: $, \(, \[
  // Avoid matching stray backslash-letter sequences (e.g. \n, \t, Windows paths)
  // that are not LaTeX math and would cause the splitter to emit raw source.
  return /\$|\\\(|\\\[/.test(text)
}

/**
 * Strip bare LaTeX command sequences that LLMs sometimes emit WITHOUT
 * surrounding $ delimiters — e.g. \frac{a}{b}, \boxed{x}, \text{hello},
 * \alpha, \rightarrow, etc.  These are NOT math-delimited so they fall
 * through hasLatex() and render as ugly raw text.
 *
 * Strategy: replace the most common patterns with readable Unicode/ASCII.
 */
export function stripBareLaTeX(text: string): string {
  return text
    // \frac{a}{b} → a/b
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
    // \sqrt{x} → √x
    .replace(/\\sqrt\{([^}]*)\}/g, '√($1)')
    // \boxed{x} → [x]
    .replace(/\\boxed\{([^}]*)\}/g, '[$1]')
    // \text{x} → x (strip wrapper)
    .replace(/\\text\{([^}]*)\}/g, '$1')
    // \mathrm{x}, \mathbf{x}, \mathit{x}, etc.
    .replace(/\\math[a-z]+\{([^}]*)\}/g, '$1')
    // Remaining {content} braces from commands like \left{, \right}
    .replace(/\\(?:left|right)[({[|)}\]|]/g, '')
    // Greek letters → Unicode
    .replace(/\\alpha\b/g, 'α').replace(/\\beta\b/g, 'β').replace(/\\gamma\b/g, 'γ')
    .replace(/\\delta\b/g, 'δ').replace(/\\epsilon\b/g, 'ε').replace(/\\zeta\b/g, 'ζ')
    .replace(/\\eta\b/g, 'η').replace(/\\theta\b/g, 'θ').replace(/\\iota\b/g, 'ι')
    .replace(/\\kappa\b/g, 'κ').replace(/\\lambda\b/g, 'λ').replace(/\\mu\b/g, 'μ')
    .replace(/\\nu\b/g, 'ν').replace(/\\xi\b/g, 'ξ').replace(/\\pi\b/g, 'π')
    .replace(/\\rho\b/g, 'ρ').replace(/\\sigma\b/g, 'σ').replace(/\\tau\b/g, 'τ')
    .replace(/\\phi\b/g, 'φ').replace(/\\psi\b/g, 'ψ').replace(/\\omega\b/g, 'ω')
    .replace(/\\Gamma\b/g, 'Γ').replace(/\\Delta\b/g, 'Δ').replace(/\\Theta\b/g, 'Θ')
    .replace(/\\Lambda\b/g, 'Λ').replace(/\\Pi\b/g, 'Π').replace(/\\Sigma\b/g, 'Σ')
    .replace(/\\Phi\b/g, 'Φ').replace(/\\Psi\b/g, 'Ψ').replace(/\\Omega\b/g, 'Ω')
    // Common operators
    .replace(/\\cdot\b/g, '·').replace(/\\times\b/g, '×').replace(/\\div\b/g, '÷')
    .replace(/\\pm\b/g, '±').replace(/\\leq\b/g, '≤').replace(/\\geq\b/g, '≥')
    .replace(/\\neq\b/g, '≠').replace(/\\approx\b/g, '≈').replace(/\\infty\b/g, '∞')
    .replace(/\\rightarrow\b/g, '→').replace(/\\leftarrow\b/g, '←').replace(/\\Rightarrow\b/g, '⇒')
    .replace(/\\Leftrightarrow\b/g, '⟺').replace(/\\to\b/g, '→')
    .replace(/\\in\b/g, '∈').replace(/\\subset\b/g, '⊂').replace(/\\cup\b/g, '∪').replace(/\\cap\b/g, '∩')
    .replace(/\\forall\b/g, '∀').replace(/\\exists\b/g, '∃').replace(/\\partial\b/g, '∂')
    .replace(/\\nabla\b/g, '∇').replace(/\\int\b/g, '∫').replace(/\\sum\b/g, '∑').replace(/\\prod\b/g, '∏')
    // Superscripts — ^{2} → ² etc. (best-effort)
    .replace(/\^\{([^}]*)\}/g, '^$1')
    // Subscripts — _{2} → remove braces
    .replace(/_\{([^}]*)\}/g, '_$1')
    // Any remaining lone backslash-word sequences (unknown commands) → strip
    .replace(/\\[a-zA-Z]+\b/g, '')
    // Stray lone braces
    .replace(/[{}]/g, '')
}

/**
 * Split *text* into alternating plain-text / LaTeX segments and return a React
 * node array.  Handles $$...$$, $...$, \[...\], and \(...\).
 *
 * Each LaTeX segment is rendered via KaTeX; parse failures fall back to the
 * raw source wrapped in <code> so the content is still visible.
 */
export function renderMixedLatex(text: string): React.ReactNode[] {
  // Split on $$...$$, $...$, \[...\], \(...\)
  // Capture groups preserve the delimiters so we can identify block vs inline.
  const parts = text.split(
    /(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g
  )

  return parts.map((part, i) => {
    if (!part) return null

    // Display math: $$ or \[
    if (/^\$\$[\s\S]*\$\$$/.test(part)) {
      const inner = part.slice(2, -2)
      const html = katexToHtml(inner, true)
      if (html) {
        return (
          <span
            key={i}
            className="katex-display-inline"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: html }}
            style={{ display: 'block', overflowX: 'auto', padding: '0.2rem 0' }}
          />
        )
      }
      return <code key={i}>{inner}</code>
    }

    if (/^\\\[[\s\S]*\\\]$/.test(part)) {
      const inner = part.slice(2, -2)
      const html = katexToHtml(inner, true)
      if (html) {
        return (
          <span
            key={i}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: html }}
            style={{ display: 'block', overflowX: 'auto', padding: '0.2rem 0' }}
          />
        )
      }
      return <code key={i}>{inner}</code>
    }

    // Inline math: $ or \(
    if (/^\$[^$]*\$$/.test(part)) {
      const inner = part.slice(1, -1)
      const html = katexToHtml(inner, false)
      if (html) {
        return (
          <span
            key={i}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      }
      return <code key={i}>{inner}</code>
    }

    if (/^\\\([\s\S]*\\\)$/.test(part)) {
      const inner = part.slice(2, -2)
      const html = katexToHtml(inner, false)
      if (html) {
        return (
          <span
            key={i}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      }
      return <code key={i}>{inner}</code>
    }

    // Plain text — detect direction for Arabic/RTL support
    return (
      <span key={i} dir="auto">
        {part}
      </span>
    )
  })
}

/**
 * A component that renders a string which may contain LaTeX and/or Arabic text.
 * Automatically handles RTL via dir="auto".
 */
export function MixedText({ text, style }: { text: string; style?: React.CSSProperties }) {
  if (!text) return null
  if (!hasLatex(text)) {
    // Plain text path — strip any bare LaTeX commands that slipped through without delimiters
    const clean = stripBareLaTeX(text)
    return (
      <span dir="auto" style={style}>
        {clean}
      </span>
    )
  }
  return (
    <span dir="auto" style={style}>
      {renderMixedLatex(text)}
    </span>
  )
}
