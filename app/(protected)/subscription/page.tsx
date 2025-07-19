'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Crown, 
  Users, 
  Clock, 
  CreditCard, 
  TrendingUp, 
  Calendar,
  Receipt,
  Settings,
  CheckCircle,
  AlertCircle,
  Star,
  Zap,
  Plus,
  Minus
} from 'lucide-react'

interface SubscriptionInfo {
  subscription_id: string
  package_name: string
  package_display_name: string
  status: string
  billing_cycle: string
  current_agents: number
  current_minutes: number
  monthly_price: number
  next_billing_date: string
  is_trial: boolean
  trial_days_left: number
}

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  max_agents: number
  price_monthly: number
  yearly_price: number | null
  features: any
  is_popular: boolean
  sort_order: number
}

interface BillingHistory {
  id: string
  invoice_number: string
  amount: number
  status: string
  billing_period_start: string
  billing_period_end: string
  due_date: string
  paid_at: string | null
}

export default function SubscriptionPage() {
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([])
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'billing' | 'agents'>('overview')
  const [agentCount, setAgentCount] = useState(0)
  const [newAgentCount, setNewAgentCount] = useState(0)
  const [upgradeLoading, setUpgradeLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchSubscriptionData()
  }, [])

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true)
      
      // קבלת פרטי המשתמש והחברה
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setError('שגיאה באימות המשתמש')
        return
      }

      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('company_id, role')
        .eq('id', user.id)
        .single()

      if (userDataError || !userData) {
        setError('שגיאה בקבלת פרטי המשתמש')
        return
      }

      // בדיקה שיש company_id
      if (!userData.company_id) {
        setError('משתמש לא משויך לחברה')
        return
      }

      // קבלת מידע מנוי - במקום הפונקציה שמחקנו, נשתמש בשאילתה ישירה
      const { data: subInfo, error: subError } = await supabase
        .from('company_subscriptions')
        .select('*')
        .eq('company_id', userData.company_id)
        .eq('is_active', true)
        .single()

      if (subError) {
        console.error('Subscription info error:', subError)
        setError('שגיאה בקבלת מידע מנוי')
        return
      }

      if (subInfo && subInfo.length > 0) {
        setSubscriptionInfo(subInfo[0])
        setAgentCount(subInfo[0].current_agents)
        setNewAgentCount(subInfo[0].current_agents)
      }

      // קבלת חבילות זמינות
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (plansError) {
        console.error('Plans error:', plansError)
      } else {
        setAvailablePlans(plans || [])
      }

      // קבלת היסטוריית חיובים
      const { data: billing, error: billingError } = await supabase
        .from('billing_history')
        .select('*')
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (billingError) {
        console.error('Billing history error:', billingError)
      } else {
        setBillingHistory(billing || [])
      }

    } catch (error: any) {
      console.error('Error fetching subscription data:', error)
      setError('שגיאה כללית בטעינת הנתונים')
    } finally {
      setLoading(false)
    }
  }

  const calculateAgentPrice = (agents: number) => {
    let totalPrice = 0
    let remainingAgents = agents
    
    // מדרגה 1: 1-5 נציגים = $69 לכל אחד
    if (remainingAgents > 0) {
      const agentsInTier = Math.min(remainingAgents, 5)
      totalPrice += agentsInTier * 69
      remainingAgents -= agentsInTier
    }
    
    // מדרגה 2: 6-10 נציגים = $59 לכל אחד
    if (remainingAgents > 0) {
      const agentsInTier = Math.min(remainingAgents, 5)
      totalPrice += agentsInTier * 59
      remainingAgents -= agentsInTier
    }
    
    // מדרגה 3: 11+ נציגים = $49 לכל אחד
    if (remainingAgents > 0) {
      totalPrice += remainingAgents * 49
    }
    
    return totalPrice
  }

  const handleAgentCountChange = async () => {
    if (newAgentCount === agentCount || !subscriptionInfo) return

    setUpgradeLoading(true)
    try {
      const response = await fetch('/api/subscription/update-agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscriptionInfo.subscription_id,
          newAgentCount: newAgentCount
        })
      })

      const result = await response.json()

      if (response.ok) {
        // רענון נתונים
        await fetchSubscriptionData()
        alert('מספר הנציגים עודכן בהצלחה!')
      } else {
        throw new Error(result.error || 'שגיאה בעדכון מספר הנציגים')
      }

    } catch (error: any) {
      console.error('Error updating agent count:', error)
      alert(`שגיאה: ${error.message}`)
    } finally {
      setUpgradeLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">שגיאה</h2>
            <p className="text-gray-600 mb-4">{error}</p>
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* כותרת */}
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4" />
            חזרה לדשבורד
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ניהול מנוי</h1>
          <p className="text-gray-600">נהלו את החבילה שלכם, הוסיפו נציגים וצפו בחיובים</p>
        </div>

        {/* טאבים */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8 overflow-x-auto">
          {[
            { id: 'overview', label: 'סקירה כללית', icon: Crown },
            { id: 'agents', label: 'ניהול נציגים', icon: Users },
            { id: 'plans', label: 'שדרוג חבילה', icon: TrendingUp },
            { id: 'billing', label: 'חיובים', icon: Receipt }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex-1 min-w-max py-3 px-4 rounded-md font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* תוכן לפי טאב */}
        {subscriptionInfo && (
          <>
            {/* טאב סקירה כללית */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* כרטיס מצב נוכחי */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Crown className="w-6 h-6 text-yellow-500" />
                    <h2 className="text-xl font-semibold text-gray-800">המצב הנוכחי שלכם</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Star className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="font-medium text-gray-800 mb-1">חבילה נוכחית</h3>
                      <p className="text-2xl font-bold text-blue-600">{subscriptionInfo.package_display_name}</p>
                      <p className="text-sm text-gray-600">{subscriptionInfo.status === 'active' ? 'פעילה' : 'לא פעילה'}</p>
                    </div>

                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Users className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="font-medium text-gray-800 mb-1">נציגים פעילים</h3>
                      <p className="text-2xl font-bold text-green-600">{subscriptionInfo.current_agents}</p>
                      <p className="text-sm text-gray-600">{subscriptionInfo.current_minutes.toLocaleString()} דקות</p>
                    </div>

                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CreditCard className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="font-medium text-gray-800 mb-1">חיוב חודשי</h3>
                      <p className="text-2xl font-bold text-purple-600">{formatCurrency(subscriptionInfo.monthly_price)}</p>
                      <p className="text-sm text-gray-600">
                        חיוב הבא: {formatDate(subscriptionInfo.next_billing_date)}
                      </p>
                    </div>
                  </div>

                  {subscriptionInfo.is_trial && (
                    <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-800">תקופת ניסיון</p>
                        <p className="text-sm text-yellow-700">
                          נותרו לכם {subscriptionInfo.trial_days_left} ימים בתקופת הניסיון החינמית
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* פעולות מהירות */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">פעולות מהירות</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveTab('agents')}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                    >
                      <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <h4 className="font-medium text-gray-800">הוספת נציגים</h4>
                      <p className="text-sm text-gray-600">הוסיפו עוד נציגים לצוות</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('plans')}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                    >
                      <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <h4 className="font-medium text-gray-800">שדרוג חבילה</h4>
                      <p className="text-sm text-gray-600">עברו לחבילה מתקדמת יותר</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('billing')}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                    >
                      <Receipt className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <h4 className="font-medium text-gray-800">היסטוריית חיובים</h4>
                      <p className="text-sm text-gray-600">צפו בחשבוניות וחיובים</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* טאב ניהול נציגים */}
            {activeTab === 'agents' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-800">ניהול נציגים</h2>
                </div>

                <div className="space-y-6">
                  {/* מצב נוכחי */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-800 mb-3">מצב נוכחי</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">נציגים פעילים</p>
                        <p className="text-2xl font-bold text-blue-600">{agentCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">דקות זמינות</p>
                        <p className="text-2xl font-bold text-green-600">{(agentCount * 240).toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">עלות חודשית</p>
                        <p className="text-2xl font-bold text-purple-600">{formatCurrency(calculateAgentPrice(agentCount))}</p>
                      </div>
                    </div>
                  </div>

                  {/* שינוי מספר נציגים */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-800 mb-4">עדכון מספר נציגים</h3>
                    
                    <div className="flex items-center gap-4 mb-4">
                      <button
                        onClick={() => setNewAgentCount(Math.max(1, newAgentCount - 1))}
                        className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      
                      <div className="text-center min-w-24">
                        <p className="text-2xl font-bold text-gray-800">{newAgentCount}</p>
                        <p className="text-sm text-gray-600">נציגים</p>
                      </div>
                      
                      <button
                        onClick={() => setNewAgentCount(newAgentCount + 1)}
                        className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {newAgentCount !== agentCount && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <h4 className="font-medium text-blue-800 mb-2">השינוי המוצע</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">נציגים חדשים: <span className="font-medium">{newAgentCount}</span></p>
                            <p className="text-gray-600">דקות חדשות: <span className="font-medium">{(newAgentCount * 240).toLocaleString()}</span></p>
                          </div>
                          <div>
                            <p className="text-gray-600">עלות חדשה: <span className="font-medium">{formatCurrency(calculateAgentPrice(newAgentCount))}</span></p>
                            <p className={`font-medium ${newAgentCount > agentCount ? 'text-red-600' : 'text-green-600'}`}>
                              {newAgentCount > agentCount ? '+' : ''}{formatCurrency(calculateAgentPrice(newAgentCount) - calculateAgentPrice(agentCount))}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleAgentCountChange}
                      disabled={upgradeLoading || newAgentCount === agentCount}
                      className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {upgradeLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          מעדכן...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          עדכון מספר הנציגים
                        </>
                      )}
                    </button>
                  </div>

                  {/* הסבר על תמחור */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-800 mb-3">מדרגות התמחור</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>1-5 נציגים:</span>
                        <span className="font-medium">$69 לנציג</span>
                      </div>
                      <div className="flex justify-between">
                        <span>6-10 נציגים:</span>
                        <span className="font-medium">$59 לנציג</span>
                      </div>
                      <div className="flex justify-between">
                        <span>11+ נציגים:</span>
                        <span className="font-medium">$49 לנציג</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* טאב שדרוג חבילות */}
            {activeTab === 'plans' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                    <h2 className="text-xl font-semibold text-gray-800">חבילות זמינות</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {availablePlans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`border-2 rounded-lg p-6 ${
                          plan.name === subscriptionInfo.package_name
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {plan.is_popular && (
                          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium mb-4 w-fit">
                            מומלץ
                          </div>
                        )}

                        <h3 className="text-lg font-bold text-gray-800 mb-2">{plan.name}</h3>
                        <p className="text-3xl font-bold text-blue-600 mb-2">
                          {formatCurrency(plan.price_monthly)}
                          <span className="text-sm text-gray-500">/חודש</span>
                        </p>
                        <p className="text-sm text-gray-600 mb-4">עד {plan.max_agents} נציגים</p>
                        <p className="text-sm text-gray-600 mb-6">{plan.description}</p>

                        {plan.name === subscriptionInfo.package_name ? (
                          <div className="flex items-center gap-2 text-blue-600">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-medium">החבילה הנוכחית שלכם</span>
                          </div>
                        ) : (
                          <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            שדרוג לחבילה זו
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* טאב היסטוריית חיובים */}
            {activeTab === 'billing' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Receipt className="w-6 h-6 text-purple-600" />
                  <h2 className="text-xl font-semibold text-gray-800">היסטוריית חיובים</h2>
                </div>

                {billingHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-right py-3 px-4 font-medium text-gray-700">מספר חשבונית</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-700">תקופת חיוב</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-700">סכום</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-700">סטטוס</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-700">תאריך תשלום</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billingHistory.map((invoice) => (
                          <tr key={invoice.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono text-sm">{invoice.invoice_number}</td>
                            <td className="py-3 px-4">
                              {formatDate(invoice.billing_period_start)} - {formatDate(invoice.billing_period_end)}
                            </td>
                            <td className="py-3 px-4 font-medium">{formatCurrency(invoice.amount)}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                invoice.status === 'paid' 
                                  ? 'bg-green-100 text-green-800'
                                  : invoice.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {invoice.status === 'paid' ? 'שולם' : 
                                 invoice.status === 'pending' ? 'ממתין' : 'נכשל'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {invoice.paid_at ? formatDate(invoice.paid_at) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">אין חיובים עדיין</h3>
                    <p className="text-gray-500">היסטוריית החיובים שלכם תופיע כאן</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
} 