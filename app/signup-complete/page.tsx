'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, ArrowRight, Building, CreditCard, FileText } from 'lucide-react'

export default function SignupCompletePage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          // אם אין משתמש מחובר, חזרה ללוגין
          router.push('/login')
          return
        }

        // בדיקה אם המשתמש כבר קיים בטבלת users
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email!)
          .maybeSingle()

        if (userData && userData.is_approved) {
          // המשתמש כבר מאושר - הפנייה לדשבורד
          router.push('/dashboard')
          return
        }

        // המשתמש חדש או לא מאושר - המתן לפעולת המשתמש

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-glacier-primary-50 via-white to-glacier-secondary-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-2xl w-full">
          {/* כרטיס ראשי */}
          <div className="relative backdrop-blur-xl bg-white/80 border border-glacier-neutral-200/50 rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-glacier-primary-100 to-glacier-secondary-100 rounded-full mb-6">
                <CheckCircle className="w-10 h-10 text-glacier-primary-600" />
              </div>
              
              <h1 className="text-3xl font-bold text-glacier-neutral-800 mb-4">
                ברוכים הבאים לCoachee! 🎉
              </h1>
              
              <p className="text-lg text-glacier-neutral-600 mb-6">
                נותרו רק כמה שלבים קצרים להשלמת ההרשמה שלכם
              </p>
            </div>

            {/* שלבי ההרשמה */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-4 space-x-reverse p-4 bg-glacier-primary-50 rounded-2xl border border-glacier-primary-200">
                <div className="flex items-center justify-center w-10 h-10 bg-glacier-primary-100 rounded-full">
                  <Building className="w-5 h-5 text-glacier-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-glacier-neutral-800">פרטי החברה</h3>
                  <p className="text-sm text-glacier-neutral-600">מלא את פרטי החברה והמוצרים שלכם</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 space-x-reverse p-4 bg-glacier-secondary-50 rounded-2xl border border-glacier-secondary-200">
                <div className="flex items-center justify-center w-10 h-10 bg-glacier-secondary-100 rounded-full">
                  <CreditCard className="w-5 h-5 text-glacier-secondary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-glacier-neutral-800">בחירת חבילה</h3>
                  <p className="text-sm text-glacier-neutral-600">בחר את החבילה המתאימה לצרכי החברה</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 space-x-reverse p-4 bg-green-50 rounded-2xl border border-green-200">
                <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-glacier-neutral-800">הפעלת החשבון</h3>
                  <p className="text-sm text-glacier-neutral-600">קבל גישה מיידית לפלטפורמה</p>
                </div>
              </div>
            </div>

            {/* הערה חשובה */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
              <div className="flex items-start space-x-3 space-x-reverse">
                <div className="flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">חשוב לדעת:</h4>
                  <p className="text-sm text-blue-800">
                    אתם נרשמים כמנהלי החברה ותקבלו גישה מלאה למערכת.
                    תוכלו להוסיף נציגי מכירות נוספים לאחר ההרשמה.
                  </p>
                </div>
              </div>
            </div>

            {/* כפתור המשך */}
            <button
              onClick={handleContinueSignup}
              className="w-full bg-gradient-to-r from-glacier-primary-600 to-glacier-secondary-600 hover:from-glacier-primary-700 hover:to-glacier-secondary-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 space-x-reverse"
            >
              <span>המשך להשלמת ההרשמה</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* קישור חזרה */}
            <div className="text-center mt-4">
              <button
                onClick={() => router.push('/login')}
                className="text-glacier-neutral-500 hover:text-glacier-neutral-700 text-sm underline"
              >
                חזרה לדף ההתחברות
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 