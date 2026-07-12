/**
 * Minimal KaTeX helpers for rendering LaTeX in the frontend.
 * Full KaTeX is imported dynamically to avoid SSR issues.
 */
export function renderLatex(latex: string): string {
  // Strip $...$ or $$...$$ delimiters for display
  return latex
    .replace(/\$\$(.*?)\$\$/g, (_, inner) => inner)
    .replace(/\$(.*?)\$/g, (_, inner) => inner)
}
