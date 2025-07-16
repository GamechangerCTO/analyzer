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
  title: 'Coachee - פלטפורמת אימון מכירות ושירות',
  description: 'פלטפורמת אימון דיגיטלית חדשנית המיועדת לשפר ביצועים עסקיים במכירות ושירות באמצעות ניתוח שיחות חכם ובינה מלאכותית',
  keywords: 'מכירות, אימון, ניתוח שיחות, שירות לקוחות, בינה מלאכותית, פלטפורמת אימון, coachee',
  authors: [{ name: 'Coachee Team' }],
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