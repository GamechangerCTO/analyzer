'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, Building, CreditCard, Rocket, Shield, Users, Sparkles } from 'lucide-react'
import Image from 'next/image'

export default function SignupCompletePage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/login')
          return
        }

        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email!)
          .maybeSingle()

        if (userData && userData.is_approved) {
          router.push('/dashboard')
          return
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Error checking auth:', error)
        router.push('/login')
      }
    }

    checkAuthAndRedirect()
  }, [router, supabase])

  const handleContinueSignup = () => {
    router.push('/signup')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-bg-light via-white to-brand-accent-light flex items-center justify-center">
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
      {/* Background decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-brand-primary-light/20 to-brand-secondary-light/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-brand-secondary-light/30 to-brand-primary-light/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-brand-accent-light/30 to-brand-secondary-light/20 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className="max-w-2xl w-full">
          {/* Logo */}
          <div className="text-center mb-6 animate-in slide-in-from-top duration-500">
            <div className="inline-flex items-center justify-center w-32 h-32 mb-2 group hover:scale-110 transition-all duration-300">
              <Image
                src="/logo.png"
                alt="Coachee Logo"
                width={128}
                height={128}
                className="transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <p className="text-base text-neutral-600 font-medium">
              פלטפורמת אימון מכירות ושירות
            </p>
          </div>

          {/* Main Card */}
          <div className="backdrop-blur-xl bg-white/95 border-2 border-brand-primary/20 rounded-tl-3xl rounded-br-3xl p-8 shadow-2xl shadow-brand-primary/15 animate-in slide-in-from-bottom duration-500">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-brand-secondary to-brand-secondary-dark rounded-full mb-6 shadow-xl shadow-brand-secondary/30">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-3xl font-bold text-neutral-800 mb-4">
                ברוכים הבאים לCoachee! 🎉
              </h1>
              
              <p className="text-lg text-neutral-600 mb-2">
                נותרו רק <span className="font-bold text-brand-primary">3 שלבים קצרים</span>
              </p>
              <p className="text-neutral-500">
                להשלמת ההרשמה והתחלת המסע שלכם
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-4 mb-8">
              {/* Step 1 */}
              <div className="group flex items-center gap-4 p-5 bg-gradient-to-r from-brand-primary/5 to-brand-primary/10 rounded-2xl border-2 border-brand-primary/20 hover:border-brand-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-brand-primary/10">
                <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 bg-gradient-to-br from-brand-primary to-brand-primary-dark rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <Building className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-brand-primary text-white text-xs font-bold rounded-full">שלב 1</span>
                    <h3 className="font-bold text-neutral-800 text-lg">פרטי החברה</h3>
                  </div>
                  <p className="text-neutral-600">מלאו את פרטי החברה והמוצרים שלכם</p>
                </div>
                <ArrowRight className="w-5 h-5 text-brand-primary/50 group-hover:translate-x-1 group-hover:text-brand-primary transition-all" />
              </div>

              {/* Step 2 */}
              <div className="group flex items-center gap-4 p-5 bg-gradient-to-r from-brand-info/5 to-brand-info/10 rounded-2xl border-2 border-brand-info/20 hover:border-brand-info/40 transition-all duration-300 hover:shadow-lg hover:shadow-brand-info/10">
                <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 bg-gradient-to-br from-brand-info to-brand-info-dark rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <CreditCard className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-brand-info text-white text-xs font-bold rounded-full">שלב 2</span>
                    <h3 className="font-bold text-neutral-800 text-lg">בחירת חבילה</h3>
                  </div>
                  <p className="text-neutral-600">בחרו את החבילה המתאימה לצרכי החברה</p>
                </div>
                <ArrowRight className="w-5 h-5 text-brand-info/50 group-hover:translate-x-1 group-hover:text-brand-info transition-all" />
              </div>

              {/* Step 3 */}
              <div className="group flex items-center gap-4 p-5 bg-gradient-to-r from-brand-secondary/5 to-brand-secondary/10 rounded-2xl border-2 border-brand-secondary/20 hover:border-brand-secondary/40 transition-all duration-300 hover:shadow-lg hover:shadow-brand-secondary/10">
                <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 bg-gradient-to-br from-brand-secondary to-brand-secondary-dark rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <Rocket className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-brand-secondary text-white text-xs font-bold rounded-full">שלב 3</span>
                    <h3 className="font-bold text-neutral-800 text-lg">הפעלת החשבון</h3>
                  </div>
                  <p className="text-neutral-600">קבלו גישה מיידית לפלטפורמה והתחילו!</p>
                </div>
                <ArrowRight className="w-5 h-5 text-brand-secondary/50 group-hover:translate-x-1 group-hover:text-brand-secondary transition-all" />
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-gradient-to-r from-brand-warning-light to-brand-warning-light/50 border-2 border-brand-warning/30 rounded-2xl p-5 mb-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-gradient-to-br from-brand-warning to-brand-warning-dark rounded-xl">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-brand-warning-dark mb-1 text-lg">💡 חשוב לדעת</h4>
                  <p className="text-neutral-700">
                    אתם נרשמים כ<strong>מנהלי החברה</strong> ותקבלו גישה מלאה למערכת.
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-neutral-600">
                    <Users className="w-4 h-4" />
                    <span>תוכלו להוסיף נציגי מכירות נוספים לאחר ההרשמה</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleContinueSignup}
              className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary-dark hover:to-brand-primary text-white font-bold py-5 px-8 rounded-tl-2xl rounded-br-2xl transition-all duration-300 shadow-xl shadow-brand-primary/30 hover:shadow-2xl hover:shadow-brand-primary/40 transform hover:-translate-y-1 flex items-center justify-center gap-3 text-lg"
            >
              <span>המשך להשלמת ההרשמה</span>
              <ArrowRight className="w-6 h-6" />
            </button>

            {/* Back Link */}
            <div className="text-center mt-6">
              <button
                onClick={() => router.push('/login')}
                className="text-neutral-500 hover:text-brand-primary text-sm font-medium transition-colors duration-200"
              >
                ← חזרה לדף ההתחברות
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-neutral-500 text-sm">
              © 2025 Coachee. פלטפורמת אימון המכירות המתקדמת בישראל
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
