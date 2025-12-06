'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, ArrowRight, Building, CreditCard, Rocket, Sparkles, Shield, Users } from 'lucide-react'

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
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-pink-400/30 to-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-400/20 to-violet-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className="max-w-2xl w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-xl">C</span>
              </div>
              <span className="text-2xl font-bold text-white">coachee</span>
            </div>
          </div>

          {/* Main Card */}
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/50 rounded-3xl p-8 shadow-2xl shadow-black/20">
            {/* Decorative corner */}
            <div className="absolute -top-3 -right-3 w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl -rotate-12 opacity-90"></div>
            <div className="absolute -top-2 -right-2 w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl rotate-6"></div>
            
            <div className="relative">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mb-6 shadow-xl shadow-emerald-500/30">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
                
                <h1 className="text-4xl font-black text-gray-900 mb-4">
                  ברוכים הבאים! 🎉
                </h1>
                
                <p className="text-xl text-gray-600 mb-2">
                  נותרו רק <span className="font-bold text-indigo-600">3 שלבים קצרים</span>
                </p>
                <p className="text-gray-500">
                  להשלמת ההרשמה והתחלת המסע שלכם
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-4 mb-8">
                {/* Step 1 */}
                <div className="group flex items-center gap-4 p-5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 hover:border-indigo-400 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
                  <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                    <Building className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">שלב 1</span>
                      <h3 className="font-bold text-gray-800 text-lg">פרטי החברה</h3>
                    </div>
                    <p className="text-gray-600">מלאו את פרטי החברה והמוצרים שלכם</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </div>

                {/* Step 2 */}
                <div className="group flex items-center gap-4 p-5 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl border-2 border-cyan-200 hover:border-cyan-400 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10">
                  <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                    <CreditCard className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-cyan-600 text-white text-xs font-bold rounded-full">שלב 2</span>
                      <h3 className="font-bold text-gray-800 text-lg">בחירת חבילה</h3>
                    </div>
                    <p className="text-gray-600">בחרו את החבילה המתאימה לצרכי החברה</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                </div>

                {/* Step 3 */}
                <div className="group flex items-center gap-4 p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200 hover:border-emerald-400 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
                  <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                    <Rocket className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-emerald-600 text-white text-xs font-bold rounded-full">שלב 3</span>
                      <h3 className="font-bold text-gray-800 text-lg">הפעלת החשבון</h3>
                    </div>
                    <p className="text-gray-600">קבלו גישה מיידית לפלטפורמה והתחילו!</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 mb-8">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-900 mb-1 text-lg">💡 חשוב לדעת</h4>
                    <p className="text-amber-800">
                      אתם נרשמים כ<strong>מנהלי החברה</strong> ותקבלו גישה מלאה למערכת.
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-amber-700">
                      <Users className="w-4 h-4" />
                      <span>תוכלו להוסיף נציגי מכירות נוספים לאחר ההרשמה</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={handleContinueSignup}
                className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold py-5 px-8 rounded-2xl transition-all duration-300 shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 transform hover:-translate-y-1 flex items-center justify-center gap-3 text-lg"
              >
                <span>המשך להשלמת ההרשמה</span>
                <ArrowRight className="w-6 h-6" />
              </button>

              {/* Back Link */}
              <div className="text-center mt-6">
                <button
                  onClick={() => router.push('/login')}
                  className="text-gray-500 hover:text-indigo-600 text-sm font-medium transition-colors duration-200"
                >
                  ← חזרה לדף ההתחברות
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-white/60 text-sm">
              © 2025 Coachee. פלטפורמת אימון המכירות המתקדמת בישראל
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
