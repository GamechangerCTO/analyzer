'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Building, 
  Users, 
  Clock, 
  Check, 
  Star, 
  ArrowRight, 
  Shield,
  Zap,
  BarChart3,
  Headphones
} from 'lucide-react'

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  max_agents: number
  base_minutes: number
  price_monthly: number
  yearly_price: number | null
  features: any
  is_popular: boolean
  sort_order: number
}

interface SignupData {
  companyName: string
  companySize: string
  companySector: string
  fullName: string
  jobTitle: string
  email: string
  phone: string
  password: string
  selectedPlan: string | null
  billingCycle: 'monthly' | 'yearly'
}

export default function SignupPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [signupData, setSignupData] = useState<SignupData>({
    companyName: '',
    companySize: '',
    companySector: '',
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    password: '',
    selectedPlan: null,
    billingCycle: 'monthly'
  })
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plansLoading, setPlansLoading] = useState(true)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (error) throw error
      setPlans(data || [])
    } catch (error) {
      console.error('Error fetching plans:', error)
      setError('שגיאה בטעינת החבילות')
    } finally {
      setPlansLoading(false)
    }
  }

  const handleStepNext = () => {
    if (currentStep === 1) {
      // ולידציה לשלב 1 - פרטי חברה
      if (!signupData.companyName.trim() || !signupData.companySize.trim() || 
          !signupData.companySector.trim() || !signupData.fullName.trim() || 
          !signupData.jobTitle.trim() || !signupData.email.trim() || !signupData.password.trim()) {
        setError('אנא מלא את כל השדות הנדרשים')
        return
      }
      if (signupData.password.length < 6) {
        setError('הסיסמה חייבת להכיל לפחות 6 תווים')
        return
      }
      setError(null)
      setCurrentStep(2)
    } else if (currentStep === 2) {
      // ולידציה לשלב 2 - בחירת חבילה
      if (!signupData.selectedPlan) {
        setError('אנא בחר חבילה')
        return
      }
      setError(null)
      setCurrentStep(3)
    }
  }

  const handleSignup = async () => {
    if (!signupData.selectedPlan) {
      setError('אנא בחר חבילה')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // יצירת חשבון משתמש
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            full_name: signupData.fullName,
            company_name: signupData.companyName
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // קריאה ל-API ליצירת החברה והמנוי
        const response = await fetch('/api/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: authData.user.id,
            companyName: signupData.companyName,
            companySize: signupData.companySize,
            companySector: signupData.companySector,
            fullName: signupData.fullName,
            jobTitle: signupData.jobTitle,
            email: signupData.email,
            phone: signupData.phone,
            selectedPlan: signupData.selectedPlan,
            billingCycle: signupData.billingCycle
          })
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'שגיאה ביצירת החשבון')
        }

        // הצלחה - הפניה לדשבורד
        router.push('/dashboard?welcome=true')
      }

    } catch (error: any) {
      console.error('Signup error:', error)
      setError(error.message || 'שגיאה ביצירת החשבון')
    } finally {
      setLoading(false)
    }
  }

  const calculateYearlyPrice = (monthlyPrice: number) => {
    return monthlyPrice * 10 // הנחה של חודשיים
  }

  const getFeatureIcon = (feature: string) => {
    if (feature.includes('ניתוח')) return <BarChart3 className="w-4 h-4" />
    if (feature.includes('תמיכה')) return <Headphones className="w-4 h-4" />
    if (feature.includes('דוחות')) return <BarChart3 className="w-4 h-4" />
    return <Check className="w-4 h-4" />
  }

  if (plansLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-6">
        {/* כותרת */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            הרשמה למנהלים ולקוחות עסקיים
          </h1>
          <p className="text-lg text-gray-600">
            פתחו חשבון חדש עבור החברה שלכם ובחרו את החבילה המתאימה
          </p>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>שימו לב:</strong> רק מנהלי חברות יכולים להירשם ישירות. 
              נציגי מכירות יתווספו על ידי המנהל לאחר מכן.
            </p>
          </div>
        </div>

        {/* אינדיקטור שלבים */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4 space-x-reverse">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* שלב 1: פרטי חברה */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <div className="text-center mb-6">
              <Building className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800">פרטי החברה</h2>
              <p className="text-gray-600">בואו נכיר - מלאו את הפרטים הבסיסיים</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שם החברה *
                </label>
                <input
                  type="text"
                  value={signupData.companyName}
                  onChange={(e) => setSignupData({...signupData, companyName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="שם החברה שלכם"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    גודל החברה *
                  </label>
                  <select
                    value={signupData.companySize}
                    onChange={(e) => setSignupData({...signupData, companySize: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">בחרו גודל</option>
                    <option value="1-5">1-5 עובדים</option>
                    <option value="6-20">6-20 עובדים</option>
                    <option value="21-50">21-50 עובדים</option>
                    <option value="51-200">51-200 עובדים</option>
                    <option value="200+">200+ עובדים</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    תחום פעילות *
                  </label>
                  <select
                    value={signupData.companySector}
                    onChange={(e) => setSignupData({...signupData, companySector: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">בחרו תחום</option>
                    <option value="technology">טכנולוגיה</option>
                    <option value="finance">כספים וביטוח</option>
                    <option value="healthcare">בריאות ורפואה</option>
                    <option value="retail">קמעונאות ומסחר</option>
                    <option value="real-estate">נדלן</option>
                    <option value="education">חינוך</option>
                    <option value="manufacturing">תעשייה וייצור</option>
                    <option value="services">שירותים עסקיים</option>
                    <option value="other">אחר</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    השם המלא שלכם *
                  </label>
                  <input
                    type="text"
                    value={signupData.fullName}
                    onChange={(e) => setSignupData({...signupData, fullName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="השם המלא שלכם"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    תפקיד *
                  </label>
                  <input
                    type="text"
                    value={signupData.jobTitle}
                    onChange={(e) => setSignupData({...signupData, jobTitle: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="למשל: מנהל מכירות, מנכ״ל"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    כתובת אימייל *
                  </label>
                  <input
                    type="email"
                    value={signupData.email}
                    onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    טלפון
                  </label>
                  <input
                    type="tel"
                    value={signupData.phone}
                    onChange={(e) => setSignupData({...signupData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="050-1234567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סיסמה *
                </label>
                <input
                  type="password"
                  value={signupData.password}
                  onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="לפחות 6 תווים"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleStepNext}
              className="w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              המשך לבחירת חבילה
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center mt-4">
              <Link href="/login" className="text-blue-600 hover:text-blue-800 text-sm">
                כבר יש לכם חשבון? התחברו כאן
              </Link>
            </div>
          </div>
        )}

        {/* שלב 2: בחירת חבילה */}
        {currentStep === 2 && (
          <div>
            <div className="text-center mb-8">
              <Star className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800">בחרו את החבילה המתאימה</h2>
              <p className="text-gray-600">כל החבילות כוללות גישה מלאה לכל התכונות</p>
            </div>

            {/* מתג חודשי/שנתי */}
            <div className="flex justify-center mb-8">
              <div className="bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setSignupData({...signupData, billingCycle: 'monthly'})}
                  className={`px-6 py-2 rounded-md font-medium transition-all ${
                    signupData.billingCycle === 'monthly'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  חיוב חודשי
                </button>
                <button
                  onClick={() => setSignupData({...signupData, billingCycle: 'yearly'})}
                  className={`px-6 py-2 rounded-md font-medium transition-all ${
                    signupData.billingCycle === 'yearly'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  חיוב שנתי
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mr-2">
                    חיסכון 17%
                  </span>
                </button>
              </div>
            </div>

            {/* רשת חבילות */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {plans.map((plan) => {
                const isSelected = signupData.selectedPlan === plan.id
                const price = signupData.billingCycle === 'yearly' 
                  ? calculateYearlyPrice(plan.price_monthly) 
                  : plan.price_monthly

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSignupData({...signupData, selectedPlan: plan.id})}
                    className={`relative bg-white rounded-lg border-2 p-6 cursor-pointer transition-all hover:shadow-lg ${
                      isSelected 
                        ? 'border-blue-500 ring-2 ring-blue-100' 
                        : plan.is_popular
                        ? 'border-green-500 ring-2 ring-green-100'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {plan.is_popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                          מומלץ
                        </span>
                      </div>
                    )}

                    <div className="text-center">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-blue-600">${price}</span>
                        <span className="text-gray-500 text-sm">
                          /{signupData.billingCycle === 'yearly' ? 'שנה' : 'חודש'}
                        </span>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          <span className="text-lg font-bold text-gray-800">
                            עד {plan.max_agents} נציגים
                          </span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-600">
                            {plan.base_minutes.toLocaleString()} דקות
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-4">{plan.description}</p>

                      {plan.features && Array.isArray(plan.features) && (
                        <div className="space-y-2">
                          {plan.features.map((feature: string, index: number) => (
                            <div key={index} className="flex items-center text-sm text-gray-600">
                              {getFeatureIcon(feature)}
                              <span className="mr-2">{feature}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {isSelected && (
                        <div className="mt-4 flex items-center justify-center text-blue-600">
                          <Check className="w-5 h-5 ml-2" />
                          <span className="font-medium">נבחר</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                חזרה
              </button>
              <button
                onClick={handleStepNext}
                disabled={!signupData.selectedPlan}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                המשך לאישור
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* שלב 3: אישור ותשלום */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <div className="text-center mb-6">
              <Shield className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800">סיכום וא ישור</h2>
              <p className="text-gray-600">בדקו את הפרטים ואשרו את ההרשמה</p>
            </div>

            {signupData.selectedPlan && (
              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-2">פרטי החברה</h3>
                  <p className="text-sm text-gray-600">שם החברה: {signupData.companyName}</p>
                  <p className="text-sm text-gray-600">גודל החברה: {signupData.companySize}</p>
                  <p className="text-sm text-gray-600">תחום פעילות: {signupData.companySector}</p>
                  <p className="text-sm text-gray-600">מנהל: {signupData.fullName}</p>
                  <p className="text-sm text-gray-600">תפקיד: {signupData.jobTitle}</p>
                  <p className="text-sm text-gray-600">אימייל: {signupData.email}</p>
                  {signupData.phone && <p className="text-sm text-gray-600">טלפון: {signupData.phone}</p>}
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-2">החבילה שנבחרה</h3>
                  {(() => {
                    const selectedPlan = plans.find(p => p.id === signupData.selectedPlan)
                    if (!selectedPlan) return null
                    
                    const price = signupData.billingCycle === 'yearly' 
                      ? calculateYearlyPrice(selectedPlan.price_monthly) 
                      : selectedPlan.price_monthly

                    return (
                      <>
                        <p className="text-sm text-gray-600">חבילה: {selectedPlan.name}</p>
                        <p className="text-sm text-gray-600">עד {selectedPlan.max_agents} נציגים</p>
                        <p className="text-sm text-gray-600">{selectedPlan.base_minutes.toLocaleString()} דקות</p>
                        <p className="font-medium text-blue-600">
                          ${price} /{signupData.billingCycle === 'yearly' ? 'שנה' : 'חודש'}
                        </p>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                חזרה
              </button>
              <button
                onClick={handleSignup}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    יוצר חשבון...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    יצירת החשבון
                  </>
                )}
              </button>
            </div>

            <div className="text-center mt-4">
              <p className="text-xs text-gray-500">
                על ידי הרשמה אתם מסכימים לתנאי השימוש ומדיניות הפרטיות
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 