'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, clearAuthStorage } from '@/lib/supabase/client'
import LoginForm from '@/components/LoginForm'
import { Sparkles, Building } from 'lucide-react'
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
          // Don't set loading to false yet, let user manually refresh
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-bg-light via-white to-brand-accent-light">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-primary-light border-t-brand-primary"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Sparkles className="w-5 h-5 text-brand-primary animate-pulse" />
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-bg-light via-white to-brand-accent-light relative overflow-hidden">
      {/* Background decorative elements with new brand colors */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-brand-primary-light/20 to-brand-secondary-light/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-brand-secondary-light/30 to-brand-primary-light/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-brand-accent-light/30 to-brand-secondary-light/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo Section */}
          <div className="text-center mb-8 animate-in slide-in-from-top duration-500">
            <div className="inline-flex items-center justify-center w-32 h-32 mb-6 group hover:scale-110 transition-all duration-300">
              <Image
                src="/logo.png"
                alt="Coachee Logo"
                width={80}
                height={80}
                className="transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-primary to-brand-primary-light bg-clip-text text-transparent">
                Coachee
              </h1>
              <p className="text-lg text-neutral-600 font-medium">
                פלטפורמת אימון מכירות ושירות
              </p>
            </div>
          </div>

          {/* Login Form Card with enhanced glassmorphism using new brand colors */}
          <div className="backdrop-blur-xl bg-white/90 border border-brand-primary-light/20 rounded-3xl p-8 shadow-2xl shadow-brand-primary/10 animate-in slide-in-from-bottom duration-500">
            <div className="mb-6 text-center">
              <h3 className="text-2xl font-bold text-neutral-800 mb-2">ברוכים הבאים</h3>
              <p className="text-neutral-600 text-sm">התחבר כדי להתחיל את המסע שלך</p>
            </div>
            <LoginForm />
            
            {/* קישור להרשמה */}
            <div className="mt-6 text-center">
              <p className="text-neutral-600 text-sm mb-3">
                עדיין אין לכם חשבון?
              </p>
              <a
                href="/signup"
                className="inline-flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-brand-primary to-brand-primary-light text-white font-medium rounded-lg hover:from-brand-primary-dark hover:to-brand-primary transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Sparkles className="w-4 h-4 ml-2" />
                הרשמה והצטרפות
              </a>
            </div>
          </div>
          
          {/* Footer Links */}
          <div className="mt-8 text-center animate-in slide-in-from-bottom duration-700 delay-400">
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-6 text-sm">
              <a 
                href="/privacy-policy" 
                className="group text-neutral-600 hover:text-brand-primary transition-all duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="relative">
                  מדיניות פרטיות
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-brand-primary to-brand-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-right"></span>
                </span>
              </a>
              <div className="hidden sm:block w-1 h-1 bg-neutral-300 rounded-full"></div>
              <a 
                href="/terms-of-service" 
                className="group text-neutral-600 hover:text-brand-primary transition-all duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="relative">
                  תנאי שימוש
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-brand-primary to-brand-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-right"></span>
                </span>
              </a>
            </div>
            
            <div className="mt-4 text-xs text-neutral-500">
              © 2025 Coachee. כל הזכויות שמורות.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 