'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Clock, Zap, AlertCircle, ArrowLeft, Star, Target, CheckCircle } from 'lucide-react'

interface MinutesPackage {
  id: string
  name: string
  minutes: number
  price: number
  description: string
  popular?: boolean
  per_minute_cost: number
  savings?: string
}

interface AgentPackage {
  id: string
  name: string
  agents: number
  price_per_agent: number
  description: string
  popular?: boolean
  total_minutes: number
  savings?: string
}

const minutesPackages: MinutesPackage[] = [
  {
    id: 'small_pack',
    name: 'חבילה קטנה',
    minutes: 200,
    price: 29,
    description: '200 דקות נוספות - מושלם לחברות קטנות',
    per_minute_cost: 0.145
  },
  {
    id: 'standard_pack', 
    name: 'חבילה סטנדרטית',
    minutes: 500,
    price: 69,
    description: '500 דקות נוספות - הכי פופולרי לחברות בינוניות',
    popular: true,
    per_minute_cost: 0.138,
    savings: 'חיסכון של 5%'
  },
  {
    id: 'large_pack',
    name: 'חבילה גדולה', 
    minutes: 1000,
    price: 129,
    description: '1,000 דקות נוספות - מושלם לחברות גדולות',
    per_minute_cost: 0.129,
    savings: 'חיסכון של 11%'
  },
  {
    id: 'mega_pack',
    name: 'חבילה ענקית',
    minutes: 2000,
    price: 239,
    description: '2,000 דקות נוספות - החיסכון הגדול ביותר',
    per_minute_cost: 0.1195,
    savings: 'חיסכון של 18%'
  }
]

const agentPackages: AgentPackage[] = [
  {
    id: 'agents_1_to_5',
    name: 'חבילת נציגים קטנה',
    agents: 3,
    price_per_agent: 69,
    description: '3 נציגים נוספים עם 240 דקות לכל נציג (720 דקות סה"כ)',
    total_minutes: 720, // 3 * 240
  },
  {
    id: 'agents_6_to_10',
    name: 'חבילת נציגים בינונית',
    agents: 5,
    price_per_agent: 59,
    description: '5 נציגים נוספים עם 240 דקות לכל נציג (1,200 דקות סה"כ)',
    popular: true,
    total_minutes: 1200, // 5 * 240
    savings: 'חיסכון של $50 לנציג'
  },
  {
    id: 'agents_11_plus',
    name: 'חבילת נציגים גדולה',
    agents: 10,
    price_per_agent: 49,
    description: '10 נציגים נוספים עם 240 דקות לכל נציג (2,400 דקות סה"כ)',
    total_minutes: 2400, // 10 * 240
    savings: 'חיסכון של $200 לנציג'
  }
]

export default function PurchaseMinutesPage() {
  const [currentQuota, setCurrentQuota] = useState<{
    total_minutes: number
    used_minutes: number
    available_minutes: number
    is_poc: boolean
    can_purchase_additional: boolean
    usage_percentage: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<{userId: string, companyId: string} | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'minutes' | 'agents'>('minutes')

  const supabase = createClient()

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      // קבלת המשתמש הנוכחי
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setErrorMessage('שגיאה באימות המשתמש')
        return
      }

      // קבלת פרטי המשתמש
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('company_id, role')
        .eq('id', user.id)
        .single()

      if (userDataError || !userData) {
        setErrorMessage('לא נמצאו פרטי משתמש')
        return
      }

      if (!userData.company_id) {
        setErrorMessage('משתמש לא משויך לחברה')
        return
      }

      setUserInfo({
        userId: user.id,
        companyId: userData.company_id
      })

      // קבלת מכסת דקות נוכחית
      const { data: quotaData, error: quotaError } = await supabase
        .rpc('get_company_minutes_quota', { p_company_id: userData.company_id })

      if (quotaError) {
        console.error('Error getting minutes quota:', quotaError)
        setErrorMessage('שגיאה בקבלת נתוני מכסת הדקות')
      } else if (quotaData && quotaData.length > 0) {
        setCurrentQuota(quotaData[0])
      }

    } catch (error) {
      console.error('Error fetching user data:', error)
      setErrorMessage('שגיאה כללית בטעינת הנתונים')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (packageId: string) => {
    if (!userInfo || !currentQuota) return

    // בדיקה אם החברה יכולה לרכוש (לא POC)
    if (!currentQuota.can_purchase_additional) {
      setErrorMessage('חברות POC לא יכולות לרכוש דקות נוספות. פנו אלינו לשדרוג.')
      return
    }

    setPurchasing(true)
    setSelectedPackage(packageId)
    setErrorMessage(null)

    try {
      const selectedPkg = minutesPackages.find(pkg => pkg.id === packageId)
      if (!selectedPkg) return

      // שליחת בקשה לרכישת דקות
      const response = await fetch('/api/quota/purchase-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: packageId,
          packageName: selectedPkg.name,
          additionalMinutes: selectedPkg.minutes,
          price: selectedPkg.price,
          companyId: userInfo.companyId,
          requestedBy: userInfo.userId,
          type: 'minutes'
        })
      })

      const result = await response.json()

      if (response.ok) {
        setSuccessMessage(`✅ בקשה לרכישת ${selectedPkg.minutes.toLocaleString()} דקות נשלחה בהצלחה! נחזור אליכם בהקדם עם פרטי התשלום.`)
      } else {
        throw new Error(result.error || 'שגיאה בשליחת הבקשה')
      }

    } catch (error) {
      console.error('Error purchasing minutes:', error)
      setErrorMessage(`❌ שגיאה בשליחת הבקשה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`)
    } finally {
      setPurchasing(false)
      setSelectedPackage(null)
    }
  }

  const handlePurchaseAgents = async (packageId: string) => {
    if (!userInfo || !currentQuota) return

    // בדיקה אם החברה יכולה לרכוש (לא POC)
    if (!currentQuota.can_purchase_additional) {
      setErrorMessage('חברות POC לא יכולות לרכוש נציגים נוספים. פנו אלינו לשדרוג.')
      return
    }

    setPurchasing(true)
    setSelectedPackage(packageId)
    setErrorMessage(null)

    try {
      const selectedPkg = agentPackages.find(pkg => pkg.id === packageId)
      if (!selectedPkg) return

      const totalPrice = selectedPkg.agents * selectedPkg.price_per_agent

      // שליחת בקשה לרכישת נציגים
      const response = await fetch('/api/quota/purchase-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: packageId,
          packageName: selectedPkg.name,
          additionalAgents: selectedPkg.agents,
          additionalMinutes: selectedPkg.total_minutes,
          price: totalPrice,
          pricePerAgent: selectedPkg.price_per_agent,
          companyId: userInfo.companyId,
          requestedBy: userInfo.userId,
          type: 'agents'
        })
      })

      const result = await response.json()

      if (response.ok) {
        setSuccessMessage(`✅ בקשה לרכישת ${selectedPkg.agents} נציגים נשלחה בהצלחה! נחזור אליכם בהקדם עם פרטי התשלום.`)
      } else {
        throw new Error(result.error || 'שגיאה בשליחת הבקשה')
      }

    } catch (error) {
      console.error('Error purchasing agents:', error)
      setErrorMessage(`❌ שגיאה בשליחת הבקשה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`)
    } finally {
      setPurchasing(false)
      setSelectedPackage(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (errorMessage && !currentQuota) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">שגיאה</h2>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800">
              <ArrowLeft className="w-4 h-4" />
              חזרה לדשבורד
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-bg via-brand-bg-light to-brand-accent-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Navigation */}
        <div className="mb-8">
          <Link href="/dashboard/manager" className="coachee-btn-secondary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            חזרה לדשבורד
          </Link>
        </div>

        {/* כותרת */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md rounded-2xl px-4 py-2 mb-6 shadow-brand-soft">
            <Zap className="w-5 h-5 text-brand-primary" />
            <span className="text-sm font-medium text-brand-primary-dark">הרחבת המערכת</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold text-neutral-800 mb-4">
            רכישת <span className="text-brand-primary-dark">דקות נוספות</span>
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            הרחיבו את היכולות שלכם עם דקות נוספות או נציגים חדשים
          </p>
        </div>

        {/* תפריט טאבים */}
        <div className="flex justify-center mb-8">
          <div className="coachee-card p-2 flex">
          <button
            onClick={() => setActiveTab('minutes')}
                            className={`px-8 py-3 rounded-2xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'minutes'
                  ? 'bg-gradient-to-r from-brand-primary to-brand-primary-dark text-white shadow-brand-soft'
                  : 'text-neutral-600 hover:text-neutral-800 hover:bg-white/50'
              }`}
          >
              <Clock className="w-5 h-5" />
              רכישת דקות
          </button>
          <button
            onClick={() => setActiveTab('agents')}
                            className={`px-8 py-3 rounded-2xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'agents'
                  ? 'bg-gradient-to-r from-brand-secondary to-brand-secondary-dark text-white shadow-brand-soft'
                  : 'text-neutral-600 hover:text-neutral-800 hover:bg-white/50'
              }`}
          >
              <Target className="w-5 h-5" />
              רכישת נציגים
          </button>
          </div>
          </div>

        {/* סטטוס מכסה נוכחית */}
        {currentQuota && (
          <div className="coachee-card p-8 mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-r from-brand-primary to-brand-primary-dark p-3 rounded-2xl">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-neutral-800">המכסה הנוכחית שלכם</h2>
                <p className="text-neutral-600">מצב השימוש במערכת</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-gradient-to-r from-brand-primary/10 to-brand-primary/5 rounded-2xl p-6 border border-brand-primary/20">
                <div className="text-center">
                  <div className="text-3xl font-bold text-brand-primary-dark mb-2">
                    {currentQuota.total_minutes.toLocaleString()}
                  </div>
                  <div className="text-sm text-neutral-600">סה"כ דקות</div>
                </div>
              </div>

                            <div className="bg-gradient-to-r from-brand-secondary/10 to-brand-secondary/5 rounded-2xl p-6 border border-brand-secondary/20">
                <div className="text-center">
                  <div className="text-3xl font-bold text-brand-secondary-dark mb-2">
                    {currentQuota.used_minutes.toLocaleString()}
                  </div>
                  <div className="text-sm text-neutral-600">דקות בשימוש</div>
                </div>
              </div>

                            <div className="bg-gradient-to-r from-brand-accent/10 to-brand-accent/5 rounded-2xl p-6 border border-brand-accent/20">
                <div className="text-center">
                  <div className="text-3xl font-bold text-brand-accent-dark mb-2">
                    {currentQuota.available_minutes.toLocaleString()}
                  </div>
                  <div className="text-sm text-neutral-600">דקות זמינות</div>
                </div>
              </div>

                            <div className="bg-gradient-to-r from-brand-warning/10 to-brand-warning/5 rounded-2xl p-6 border border-brand-warning/20">
                <div className="text-center">
                  <div className="text-3xl font-bold text-brand-warning-dark mb-2">
                    {Math.round(currentQuota.usage_percentage)}%
                  </div>
                  <div className="text-sm text-neutral-600">אחוז שימוש</div>
                </div>
              </div>
            </div>

            {/* פס התקדמות */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-neutral-600 mb-2">
                <span>שימוש במכסה</span>
                <span>{Math.round(currentQuota.usage_percentage)}%</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-2xl h-3 overflow-hidden">
                <div 
                  className={`h-full rounded-2xl transition-all duration-1000 ${
                    currentQuota.usage_percentage > 80 
                      ? 'bg-gradient-to-r from-red-400 to-red-500' 
                      : currentQuota.usage_percentage > 60
                      ? 'bg-gradient-to-r from-brand-warning to-brand-warning-dark'
                      : 'bg-gradient-to-r from-brand-primary to-brand-primary-dark'
                  }`}
                  style={{ width: `${Math.min(currentQuota.usage_percentage, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* הודעות אזהרה */}
            {currentQuota.is_poc && (
              <div className="bg-glacier-info/10 border-2 border-glacier-info/30 rounded-2xl p-4 flex items-center gap-3">
                <Star className="w-5 h-5 text-glacier-info-dark" />
                <p className="text-sm text-glacier-info-dark">
                  <strong>POC:</strong> אתם במסגרת הדגמה. פנו אלינו לשדרוג לחבילה מלאה.
                </p>
              </div>
            )}

            {!currentQuota.can_purchase_additional && (
              <div className="bg-red-50/80 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-800">
                  <strong>הגבלה:</strong> לא ניתן לרכוש דקות נוספות במסגרת POC.
                </p>
              </div>
            )}
          </div>
        )}

        {/* הודעות הצלחה ושגיאה */}
        {successMessage && (
          <div className="coachee-card bg-gradient-to-r from-glacier-success/10 to-glacier-success/5 border-2 border-glacier-success/30 p-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-glacier-success to-glacier-success-dark p-2 rounded-xl">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-glacier-success-dark font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="coachee-card bg-red-50/80 border-2 border-red-200 p-6 mb-8">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800 font-medium">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* חבילות דקות */}
        {activeTab === 'minutes' && currentQuota?.can_purchase_additional && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {minutesPackages.map((pkg, index) => (
              <div 
                key={pkg.id} 
                className={`relative group cursor-pointer transition-all duration-500 hover:-translate-y-2 ${
                  pkg.popular ? 'lg:scale-105' : ''
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-glacier-warning to-glacier-warning-dark text-white px-4 py-2 rounded-2xl text-sm font-bold shadow-glacier-soft flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      מומלץ
                    </div>
                  </div>
                )}

                <div className={`coachee-card-glass p-8 h-full border-2 transition-all duration-300 ${
                  pkg.popular
                    ? 'border-glacier-warning/50 shadow-glacier-soft'
                    : 'border-white/50 hover:border-glacier-primary/50'
                }`}>
                <div className="text-center">
                    <h3 className="text-xl font-bold text-neutral-800 mb-4">{pkg.name}</h3>
                    
                    <div className="mb-6">
                      <span className="text-4xl font-bold bg-gradient-to-r from-glacier-primary-dark to-glacier-secondary-dark bg-clip-text text-transparent">
                        ${pkg.price}
                      </span>
                      <span className="text-neutral-500 text-sm mr-2">חד פעמי</span>
                    </div>
                    
                    <div className="bg-gradient-to-r from-glacier-primary/10 to-glacier-secondary/10 rounded-3xl p-6 mb-6 border border-glacier-primary/20">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="bg-gradient-to-r from-glacier-primary to-glacier-primary-dark p-3 rounded-2xl">
                          <Clock className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-neutral-800">
                            {pkg.minutes.toLocaleString()}
                          </div>
                          <div className="text-sm text-neutral-600">דקות נוספות</div>
                        </div>
                  </div>
                    </div>

                    <p className="text-sm text-neutral-600 mb-6 leading-relaxed">{pkg.description}</p>

                    <div className="space-y-3 mb-8">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">עלות לדקה:</span>
                        <span className="font-semibold text-neutral-700">${pkg.per_minute_cost.toFixed(3)}</span>
                      </div>
                      {pkg.savings && (
                        <div className="flex justify-between text-sm">
                          <span className="text-glacier-success-dark">חיסכון:</span>
                          <span className="font-semibold text-glacier-success-dark">{pkg.savings}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={purchasing}
                      className={`w-full py-4 px-6 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                      purchasing && selectedPackage === pkg.id
                          ? 'bg-neutral-400 text-neutral-600 cursor-not-allowed'
                        : pkg.popular
                          ? 'coachee-btn-primary'
                          : 'coachee-btn-secondary'
                    }`}
                  >
                    {purchasing && selectedPackage === pkg.id ? (
                      <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        מעבד...
                      </>
                    ) : (
                      <>
                          <Zap className="w-5 h-5" />
                        רכישה
                      </>
                    )}
                  </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* חבילות נציגים */}
        {activeTab === 'agents' && currentQuota?.can_purchase_additional && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {agentPackages.map((pkg, index) => (
              <div 
                key={pkg.id} 
                className={`relative group cursor-pointer transition-all duration-500 hover:-translate-y-2 ${
                  pkg.popular ? 'lg:scale-105' : ''
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-glacier-warning to-glacier-warning-dark text-white px-6 py-2 rounded-2xl text-sm font-bold shadow-glacier-soft flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      מומלץ ביותר
                    </div>
                  </div>
                )}

                <div className={`coachee-card-glass p-8 h-full border-2 transition-all duration-300 ${
                  pkg.popular
                    ? 'border-glacier-warning/50 shadow-glacier-soft'
                    : 'border-white/50 hover:border-glacier-secondary/50'
                }`}>
                <div className="text-center">
                    <h3 className="text-xl font-bold text-neutral-800 mb-4">{pkg.name}</h3>
                    
                    <div className="mb-6">
                      <span className="text-4xl font-bold bg-gradient-to-r from-glacier-secondary-dark to-glacier-accent-dark bg-clip-text text-transparent">
                        ${(pkg.agents * pkg.price_per_agent).toLocaleString()}
                      </span>
                      <span className="text-neutral-500 text-sm mr-2">סה"כ</span>
                    </div>
                    
                    <div className="bg-gradient-to-r from-glacier-secondary/10 to-glacier-accent/10 rounded-3xl p-6 mb-6 border border-glacier-secondary/20">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center justify-center gap-3">
                          <div className="bg-gradient-to-r from-glacier-secondary to-glacier-secondary-dark p-3 rounded-2xl">
                            <Target className="w-6 h-6 text-white" />
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-neutral-800">{pkg.agents}</div>
                            <div className="text-sm text-neutral-600">נציגים חדשים</div>
                    </div>
                  </div>

                        <div className="flex items-center justify-center gap-3">
                          <div className="bg-gradient-to-r from-glacier-accent to-glacier-accent-dark p-3 rounded-2xl">
                            <Clock className="w-6 h-6 text-white" />
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-neutral-800">
                              {pkg.total_minutes.toLocaleString()}
                            </div>
                            <div className="text-sm text-neutral-600">דקות נוספות</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-neutral-600 mb-6 leading-relaxed">{pkg.description}</p>

                    <div className="space-y-3 mb-8">
                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">מחיר לנציג:</span>
                        <span className="font-semibold text-neutral-700">${pkg.price_per_agent}</span>
                    </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">דקות לנציג:</span>
                        <span className="font-semibold text-neutral-700">240</span>
                      </div>
                      {pkg.savings && (
                        <div className="flex justify-between text-sm">
                          <span className="text-glacier-success-dark">חיסכון:</span>
                          <span className="font-semibold text-glacier-success-dark">{pkg.savings}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handlePurchaseAgents(pkg.id)}
                    disabled={purchasing}
                      className={`w-full py-4 px-6 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                      purchasing && selectedPackage === pkg.id
                          ? 'bg-neutral-400 text-neutral-600 cursor-not-allowed'
                        : pkg.popular
                          ? 'coachee-btn-accent'
                          : 'coachee-btn-secondary'
                    }`}
                  >
                    {purchasing && selectedPackage === pkg.id ? (
                      <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        מעבד...
                      </>
                    ) : (
                      <>
                          <Target className="w-5 h-5" />
                        רכישה
                      </>
                    )}
                  </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* הודעת POC */}
        {currentQuota && !currentQuota.can_purchase_additional && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Star className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">במסגרת POC</h3>
            <p className="text-gray-600 mb-4">
              אתם במסגרת הדגמת המוצר. לרכישת {activeTab === 'minutes' ? 'דקות נוספות' : 'נציגים נוספים'} נא פנו אלינו לשדרוג החשבון.
            </p>
            <a 
              href="mailto:support@coachee.co.il"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Target className="w-4 h-4" />
              צור קשר לשדרוג
            </a>
          </div>
        )}
      </div>
    </div>
  )
} 