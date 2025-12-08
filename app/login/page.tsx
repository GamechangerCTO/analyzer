'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, clearAuthStorage } from '@/lib/supabase/client'
import LoginForm from '@/components/LoginForm'
import Image from 'next/image'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (user && !error) {
          router.push('/dashboard?login=true')
        } else if (error && (error.message?.includes('429') || error.message?.includes('rate limit'))) {
          console.log('[AUTH] Rate limit detected, clearing auth storage')
          clearAuthStorage()
          return
        }
      } catch (error: any) {
        console.log('Auth check error:', error)
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          console.log('[AUTH] Rate limit in catch block, clearing auth storage')
          clearAuthStorage()
          return
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAuth()
  }, [router, supabase])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50">
        <div className="w-10 h-10 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-32 h-32 mb-2">
            <Image
              src="/logo.png"
              alt="Coachee Logo"
              width={128}
              height={128}
              className="object-contain"
            />
          </div>
          <p className="text-sm text-neutral-500">
            פלטפורמת אימון מכירות ושירות
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white border border-neutral-200 rounded-tl-2xl rounded-br-2xl rounded-tr-lg rounded-bl-lg p-6 shadow-sm">
          <div className="mb-6 text-center">
            <h3 className="text-xl font-semibold text-neutral-900 mb-1">ברוכים הבאים</h3>
            <p className="text-neutral-500 text-sm">התחבר כדי להתחיל</p>
          </div>
          
          <LoginForm />
          
          {/* Signup Link */}
          <div className="mt-6 text-center">
            <p className="text-neutral-500 text-sm mb-3">
              עדיין אין לכם חשבון?
            </p>
            <a
              href="/signup"
              className="inline-flex items-center justify-center w-full px-4 py-3 bg-brand-primary text-white font-medium rounded-xl hover:bg-brand-primary-dark transition-colors"
            >
              הרשמה והצטרפות
            </a>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-6 text-center">
          <div className="flex justify-center items-center space-x-4 text-sm text-neutral-500">
            <a href="/privacy-policy" className="hover:text-brand-primary transition-colors">
              מדיניות פרטיות
            </a>
            <span>•</span>
            <a href="/legal-terms" className="hover:text-brand-primary transition-colors">
              תקנון משפטי
            </a>
          </div>
          <div className="mt-2 text-xs text-neutral-400">
            © 2025 Coachee. כל הזכויות שמורות.
          </div>
        </div>
      </div>
    </div>
  )
}
