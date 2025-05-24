import './globals.css'
import type { Metadata } from 'next'
import { Rubik } from 'next/font/google'
import React from 'react'

const rubik = Rubik({ 
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'חדר כושר למכירות',
  description: 'פלטפורמת אימון דיגיטלית המיועדת לשפר ביצועים עסקיים (מכירות ושירות)',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" className={rubik.variable} dir="rtl">
      <body>
        {/* התוכן יכיל את הניווט בעמודים הפנימיים */}
        {children}
      </body>
    </html>
  )
} 