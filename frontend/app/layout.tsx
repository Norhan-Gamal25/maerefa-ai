import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Maerefa AI — STEM Creative Studio',
  description: 'Where Creativity Meets STEM — Safe, Visually Stunning, Deeply Educational',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
