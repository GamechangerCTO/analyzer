'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LoginForm from '@/components/LoginForm'
import { Sparkles } from 'lucide-react'

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
        }
      } catch (error) {
        console.log('Auth check error (non-critical):', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAuth()
  }, [router, supabase])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-glacier-primary-50 via-white to-glacier-accent-50">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-glacier-primary-200 border-t-glacier-primary-600"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Sparkles className="w-5 h-5 text-glacier-primary-600 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-glacier-primary-50 via-white to-glacier-accent-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-glacier-primary-200/30 to-glacier-accent-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-glacier-secondary-200/30 to-glacier-primary-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-glacier-accent-200/20 to-glacier-secondary-200/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Login Form Card with enhanced glassmorphism */}
          <div className="backdrop-blur-xl bg-white/80 border border-glacier-neutral-200/50 rounded-3xl p-8 shadow-2xl shadow-glacier-primary-900/10 animate-in slide-in-from-bottom duration-500">
            <div className="mb-6 text-center">
              <h3 className="text-2xl font-bold text-glacier-neutral-800 mb-2">ברוכים הבאים לCoachee</h3>
              <p className="text-glacier-neutral-600 text-sm">התחבר כדי להתחיל את המסע שלך</p>
            </div>
            <LoginForm />
          </div>
          
          {/* Footer Links */}
          <div className="mt-8 text-center animate-in slide-in-from-bottom duration-700 delay-400">
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-6 text-sm">
              <a 
                href="/privacy-policy" 
                className="group text-glacier-neutral-600 hover:text-glacier-primary-600 transition-all duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="relative">
                  מדיניות פרטיות
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-glacier-primary-500 to-glacier-accent-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-right"></span>
                </span>
              </a>
              <div className="hidden sm:block w-1 h-1 bg-glacier-neutral-300 rounded-full"></div>
              <a 
                href="/terms-of-service" 
                className="group text-glacier-neutral-600 hover:text-glacier-primary-600 transition-all duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="relative">
                  תנאי שימוש
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-glacier-primary-500 to-glacier-accent-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-right"></span>
                </span>
              </a>
            </div>
            
            <div className="mt-4 text-xs text-glacier-neutral-500">
              © 2025 Coachee. כל הזכויות שמורות.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 