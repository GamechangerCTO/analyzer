'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-glass-white via-white to-clay-accent/10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-clay-primary"></div>
      </div>
    )
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-glass-white via-white to-clay-accent/10 p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-glass-light/50 to-transparent"></div>
      
      <div className="relative w-full max-w-md">
        {/* Logo Card */}
        <div className="choacee-card-clay-raised p-8 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Image 
                src="/logo.webp" 
                alt="ReplayMe Logo" 
                width={60} 
                height={60}
                className="w-15 h-15 rounded-clay shadow-clay-soft"
              />
              <div>
                <h1 className="choacee-text-display text-3xl font-bold text-clay-primary">ReplayMe</h1>
                <div className="text-sm text-neutral-500 font-medium">חדר כושר למכירות</div>
              </div>
            </div>
            <p className="choacee-text-body text-neutral-600 text-sm leading-relaxed">
              התחבר כדי להתחיל את האימון הדיגיטלי שלך
            </p>
          </div>
        </div>
        
        {/* Login Form Card */}
        <div className="choacee-card-clay-raised p-8">
          <LoginForm />
        </div>
        
        {/* Footer Links */}
        <div className="mt-8 text-center">
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm">
            <a 
              href="/privacy-policy" 
              className="text-neutral-500 hover:text-clay-primary underline decoration-clay-accent decoration-2 underline-offset-4 transition-colors duration-200 choacee-interactive"
              target="_blank"
              rel="noopener noreferrer"
            >
              מדיניות פרטיות
            </a>
            <span className="hidden sm:inline text-clay-accent">•</span>
            <a 
              href="/terms-of-service" 
              className="text-neutral-500 hover:text-clay-primary underline decoration-clay-accent decoration-2 underline-offset-4 transition-colors duration-200 choacee-interactive"
              target="_blank"
              rel="noopener noreferrer"
            >
              תנאי שירות
            </a>
          </div>
          
          {/* Branding */}
          <div className="mt-4 text-xs text-neutral-400">
            <span>&copy; {new Date().getFullYear()} ReplayMe</span>
            <span className="mx-2">•</span>
                            <span>פלטפורמת אימון מכירות ושירות מתקדמת</span>
          </div>
        </div>
      </div>
    </div>
  )
} 