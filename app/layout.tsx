import './globals.css'
import type { Metadata } from 'next'
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'
import React from 'react'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ReplayMe - חדר כושר למכירות',
  description: 'פלטפורמת אימון דיגיטלית המיועדת לשפר ביצועים עסקיים (מכירות ושירות) באמצעות סימולציות AI וניתוח שיחות מתקדם',
  keywords: 'מכירות, אימון, AI, סימולציות, ניתוח שיחות, חדר כושר מכירתי',
  authors: [{ name: 'ReplayMe Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html 
      lang="he" 
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`} 
      dir="rtl"
    >
      <body className="font-sans antialiased">
        {/* התוכן יכיל את הניווט בעמודים הפנימיים */}
        {children}
      </body>
    </html>
  )
} 