'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Star, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Crown,
  Zap,
  BarChart3,
  Headphones,
  ArrowRight,
  Shield,
  Sparkles,
  TrendingUp
} from 'lucide-react'

interface SubscriptionPlan {
  id: string
  name: string
  description: string | null
  max_agents: number
  price_monthly: number
  yearly_price?: number | null
  features: any
  is_popular?: boolean
  sort_order?: number
  created_at?: string
}

export default function SubscriptionSetupPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(true)
  const [setupLoading, setSetupLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [companyInfo, setCompanyInfo] = useState<any>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // קבלת פרטי המשתמש והחברה
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        router.push('/login')
        return
      }

      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('company_id, role, full_name')
        .eq('id', user.id)
        .single()

      if (userDataError || !userData || userData.role === 'agent' || !userData.company_id) {
        router.push('/dashboard')
        return
      }

      // קבלת פרטי החברה
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userData.company_id!) // Add non-null assertion since we checked above
        .single()

      if (companyError || !company) {
        setError('לא נמצאו פרטי החברה')
        return
      }

      setCompanyInfo({ ...company, managerName: userData.full_name })

      // קבלת חבילות זמינות
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (plansError) {
        setError('שגיאה בטעינת החבילות')
        return
      }

      setPlans(plans || [])

    } catch (error: any) {
      console.error('Error fetching data:', error)
      setError('שגיאה כללית בטעינת הנתונים')
    } finally {
      setLoading(false)
    }
  }

  const handleSetupSubscription = async () => {
    if (!selectedPlan || !companyInfo) {
      setError('אנא בחר חבילה')
      return
    }

    setSetupLoading(true)
    setError(null)

    try {
      // חיפוש פרטי החבילה שנבחרה  
      const selectedPlanData = plans.find(p => p.id === selectedPlan!)
      if (!selectedPlanData) {
        throw new Error('החבילה שנבחרה לא נמצאה')
      }

      // הכנת הנתונים לדף התשלום
      const checkoutData = {
        planId: selectedPlanData.id,
        planName: selectedPlanData.name,
        price: billingCycle === 'yearly' 
          ? calculateYearlyPrice(selectedPlanData.price_monthly)
          : selectedPlanData.price_monthly,
        billingCycle: billingCycle,
        maxAgents: selectedPlanData.max_agents,
        features: selectedPlanData.features,
        companyId: companyInfo.id,
        companyName: companyInfo.name,
        managerName: companyInfo.managerName
      }

      // הפניה לדף התשלום עם הנתונים
      const queryString = new URLSearchParams({
        data: JSON.stringify(checkoutData)
      }).toString()
      
      router.push(`/checkout-demo?${queryString}`)

    } catch (error: any) {
      console.error('Setup error:', error)
      setError(error.message || 'שגיאה בהכנת הנתונים')
    } finally {
      setSetupLoading(false)
    }
  }

  const calculateYearlyPrice = (monthlyPrice: number) => {
    return monthlyPrice * 10 // הנחה של חודשיים
  }

  const getFeatureIcon = (feature: string) => {
    if (feature.includes('ניתוח') || feature.includes('אנליטיקה')) return <BarChart3 className="w-4 h-4 text-glacier-primary" />
    if (feature.includes('תמיכה') || feature.includes('שירות')) return <Headphones className="w-4 h-4 text-glacier-secondary" />
    if (feature.includes('אבטחה') || feature.includes('הגנה')) return <Shield className="w-4 h-4 text-glacier-accent" />
    if (feature.includes('מתקדם') || feature.includes('פרמיום')) return <Crown className="w-4 h-4 text-glacier-warning" />
    return <CheckCircle className="w-4 h-4 text-glacier-success" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-glacier-bright-1 via-glass-light to-glacier-bright-2 flex items-center justify-center">
        <div className="coachee-card p-8 max-w-md w-full mx-4">
          <div className="animate-pulse text-center">
            <div className="w-16 h-16 bg-glacier-primary rounded-3xl mx-auto mb-4"></div>
            <div className="h-4 bg-glacier-primary rounded-xl mb-2"></div>
            <div className="h-3 bg-glacier-secondary rounded-xl w-3/4 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-bg via-brand-bg-light to-brand-accent-light">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md rounded-2xl px-4 py-2 mb-6 shadow-brand-soft">
              <Sparkles className="w-5 h-5 text-brand-primary" />
              <span className="text-sm font-medium text-brand-primary-dark">התחילו במערכת המובילה</span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold text-neutral-800 mb-4">
              שלום <span className="text-glacier-primary-dark">{companyInfo?.managerName}</span>!
            </h1>
            <h2 className="text-2xl lg:text-3xl font-semibold text-neutral-700 mb-6">
              בואו נגדיר את החבילה עבור <span className="text-glacier-secondary-dark">{companyInfo?.name}</span>
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed">
              {reason === 'no-subscription' 
                ? 'כדי להמשיך להשתמש במערכת, אנא בחרו את החבילה המתאימה לכם'
                : 'בחרו את החבילה המתאימה לחברה שלכם ותתחילו להשתמש במערכת המתקדמת ביותר לאימון מכירות'
              }
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* מתג חודשי/שנתי */}
        <div className="flex justify-center mb-12">
          <div className="coachee-card p-2 flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-8 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-glacier-primary to-glacier-primary-dark text-white shadow-glacier-soft'
                  : 'text-neutral-600 hover:text-neutral-800 hover:bg-white/50'
              }`}
            >
              חיוב חודשי
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-8 py-3 rounded-2xl font-semibold transition-all duration-300 relative ${
                billingCycle === 'yearly'
                  ? 'bg-gradient-to-r from-glacier-secondary to-glacier-secondary-dark text-white shadow-glacier-soft'
                  : 'text-neutral-600 hover:text-neutral-800 hover:bg-white/50'
              }`}
            >
              חיוב שנתי
              <span className="absolute -top-2 -right-2 bg-gradient-to-r from-glacier-success to-glacier-success-dark text-white text-xs px-3 py-1 rounded-xl font-bold shadow-lg">
                חיסכון 17%
              </span>
            </button>
          </div>
        </div>

        {/* רשת חבילות */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, index) => {
            const isSelected = selectedPlan === plan.id
            const price = billingCycle === 'yearly' 
              ? calculateYearlyPrice(plan.price_monthly) 
              : plan.price_monthly

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative group cursor-pointer transition-all duration-500 hover:-translate-y-2 ${
                  plan.is_popular ? 'lg:scale-105' : ''
                }`}
              >
                {/* Popular Badge */}
                {plan.is_popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-glacier-warning to-glacier-warning-dark text-white px-6 py-2 rounded-2xl text-sm font-bold shadow-glacier-soft flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      מומלץ ביותר
                    </div>
                  </div>
                )}

                {/* Card */}
                <div className={`coachee-card-glass p-8 h-full border-2 transition-all duration-300 ${
                  isSelected 
                    ? 'border-glacier-primary shadow-glacier-hover ring-4 ring-glacier-primary/20' 
                    : plan.is_popular
                    ? 'border-glacier-warning/50 shadow-glacier-soft'
                    : 'border-white/50 hover:border-glacier-primary/50'
                }`}>
                  <div className="text-center">
                    {/* Plan Header */}
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-neutral-800 mb-3">{plan.name}</h3>
                      <div className="mb-4">
                        <span className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-glacier-primary-dark to-glacier-secondary-dark bg-clip-text text-transparent">
                          ${price}
                        </span>
                        <span className="text-neutral-500 text-lg mr-2">
                          /{billingCycle === 'yearly' ? 'שנה' : 'חודש'}
                        </span>
                        {billingCycle === 'yearly' && (
                          <div className="text-sm text-glacier-success-dark mt-1">
                            חיסכון של ${(plan.price_monthly * 2).toLocaleString()} בשנה
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Agents & Minutes Display */}
                    <div className="bg-gradient-to-r from-glacier-primary/10 to-glacier-secondary/10 rounded-3xl p-6 mb-6 border border-glacier-primary/20">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center justify-center gap-3">
                          <div className="bg-gradient-to-r from-glacier-primary to-glacier-primary-dark p-3 rounded-2xl">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-neutral-800">
                              עד {plan.max_agents} נציגים
                            </div>
                            <div className="text-sm text-neutral-600">צוות מכירות מלא</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-center gap-3">
                          <div className="bg-gradient-to-r from-glacier-secondary to-glacier-secondary-dark p-3 rounded-2xl">
                            <Clock className="w-6 h-6 text-white" />
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-neutral-800">
                              {(plan.max_agents * 240).toLocaleString()} דקות
                            </div>
                            <div className="text-sm text-neutral-600">ניתוח שיחות חודשי</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-neutral-600 mb-6 leading-relaxed">{plan.description}</p>

                    {/* Features */}
                    {plan.features && Array.isArray(plan.features) && (
                      <div className="space-y-3 mb-8">
                        {plan.features.map((feature: string, featureIndex: number) => (
                          <div key={featureIndex} className="flex items-center gap-3 text-sm text-neutral-700">
                            {getFeatureIcon(feature)}
                            <span className="text-right flex-1">{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-glacier-primary to-glacier-primary-dark text-white py-3 px-6 rounded-2xl mb-4 shadow-glacier-soft">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-semibold">חבילה נבחרה</span>
                      </div>
                    )}

                    {/* Select Button */}
                    {!isSelected && (
                      <button className="w-full coachee-btn-primary group">
                        <span>בחירת חבילה</span>
                        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-red-50/80 backdrop-blur-md border-2 border-red-200 text-red-800 p-4 rounded-3xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={handleSetupSubscription}
            disabled={setupLoading || !selectedPlan}
            className="coachee-btn-primary text-xl px-12 py-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0"
          >
            {setupLoading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                מגדיר מנוי...
              </>
            ) : (
              <>
                <Zap className="w-6 h-6" />
                הגדרת המנוי
                <TrendingUp className="w-6 h-6" />
              </>
            )}
          </button>
        </div>

        {/* Footer Text */}
        <div className="text-center mt-8">
          <p className="text-neutral-500 leading-relaxed">
            לאחר ההגדרה תוכלו להוסיף נציגים ולהתחיל להשתמש במערכת המתקדמת<br />
            <span className="text-glacier-primary-dark font-medium">תמיכה זמינה 24/7 לכל שאלה</span>
          </p>
        </div>
      </div>
    </div>
  )
} 