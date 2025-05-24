import './globals.css'
import type { Metadata } from 'next'
import { Rubik } from 'next/font/google'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase.auth.getUser()

  return (
    <html lang="he" className={rubik.variable} dir="rtl">
      <body>
        {/* התוכן יכיל את הניווט בעמודים הפנימיים */}
        {children}
      </body>
    </html>
  )
} 