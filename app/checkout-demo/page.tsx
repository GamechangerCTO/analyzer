'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, CreditCard, Building, Users, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface CheckoutData {
  planId: string
  planName: string
  price: number
  billingCycle: 'monthly' | 'yearly'
  maxAgents: number
  features: any
  companyId: string
  companyName: string
  managerName: string
}

export default function CheckoutDemoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState<'details' | 'payment' | 'success'>('details')
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // בדיקת אימות משתמש
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/login')
        return false
      }
      
      return true
    }

    const initializeData = async () => {
      const isAuthed = await checkAuth()
      if (!isAuthed) return

      // קבלת הנתונים מה-URL
      const dataParam = searchParams.get('data')
      
      if (dataParam) {
        try {
          const data = JSON.parse(dataParam) as CheckoutData
          setCheckoutData(data)
        } catch (error) {
          console.error('Error parsing checkout data:', error)
          // במקום הפניה חזרה, נשתמש בנתונים דיפולטיים
          const fallbackData: CheckoutData = {
            planId: 'fallback-plan',
            planName: 'חבילת בסיסית',
            price: 149,
            billingCycle: 'monthly',
            maxAgents: 5,
            features: ['עד 5 נציגים', '240 דקות חודשיות', 'דוחות בסיסיים'],
            companyId: 'fallback-company',
            companyName: 'החברה שלך',
            managerName: 'מנהל'
          }
          setCheckoutData(fallbackData)
        }
      } else {
        // במקום הפניה חזרה, נשתמש בנתונים דיפולטיים
        const fallbackData: CheckoutData = {
          planId: 'fallback-plan',
          planName: 'חבילת בסיסית', 
          price: 149,
          billingCycle: 'monthly',
          maxAgents: 5,
          features: ['עד 5 נציגים', '240 דקות חודשיות', 'דוחות בסיסיים'],
          companyId: 'fallback-company',
          companyName: 'החברה שלך',
          managerName: 'מנהל'
        }
        setCheckoutData(fallbackData)
      }
      setLoading(false)
    }

    initializeData()
  }, [searchParams, router])

  // נתונים דמה לפאלבק אם אין נתונים מה-URL
  const packageDetails = checkoutData ? {
    name: checkoutData.planName,
    agents: checkoutData.maxAgents,
    price: checkoutData.price,
    billingCycle: checkoutData.billingCycle,
    features: Array.isArray(checkoutData.features) ? checkoutData.features : [
      `עד ${checkoutData.maxAgents} נציגים`,
      '240 דקות ניתוח חודשיות', 
      'דוחות מתקדמים',
      'תמיכה מלאה',
      'סימולטורים מתקדמים'
    ]
  } : {
    name: 'חבילת מתקדמת',
    agents: 10,
    price: 590,
    billingCycle: 'monthly' as const,
    features: [
      'עד 10 נציגים',
      '240 דקות ניתוח חודשיות', 
      'דוחות מתקדמים',
      'תמיכה מלאה',
      'סימולטורים מתקדמים'
    ]
  }

  const handlePayment = async () => {
    if (!checkoutData) return

    setIsProcessing(true)
    
    try {
      // סימולציה של תהליך תשלום (2 שניות)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setCurrentStep('success')
      setIsProcessing(false)
      
      // כעת נשמור את המנוי במערכת
      const response = await fetch('/api/subscription/setup-existing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: checkoutData.companyId,
          selectedPlan: checkoutData.planId,
          billingCycle: checkoutData.billingCycle
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // הפניה לדשבורד עם הודעת הצלחה אחרי 5 שניות - יותר זמן לרענון מסד הנתונים
        setTimeout(() => {
          window.location.href = '/dashboard?welcome=payment-success&t=' + Date.now()
        }, 5000)
      } else {
        const errorResult = await response.json()
        console.error('❌ Error saving subscription:', errorResult)
        
        // גם במקרה של שגיאה נפנה לדשבורד - יתכן שהמנוי נשמר חלקית
        setTimeout(() => {
          window.location.href = '/dashboard?welcome=payment-demo&error=partial'
        }, 5000)
      }
      
    } catch (error) {
      console.error('Payment processing error:', error)
      setCurrentStep('success') // עדיין נציג הצלחה כי זה דמה
      setIsProcessing(false)
      
      setTimeout(() => {
        router.push('/dashboard?welcome=payment-demo')
      }, 3000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתוני חבילה...</p>
        </div>
      </div>
    )
  }

  if (currentStep === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="p-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ההזמנה הושלמה בהצלחה! 🎉
            </h2>
            <p className="text-gray-600 mb-4">
              החבילה שלך הופעלה ותוכל להתחיל להשתמש בה מיד
            </p>
            <div className="animate-pulse text-sm text-gray-500">
              מעביר לדשבורד...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          השלמת הזמנה 💳
        </h1>
        {checkoutData && (
          <p className="text-lg text-blue-600 font-semibold mb-2">
            עבור {checkoutData.companyName}
          </p>
        )}
        <p className="text-gray-600">
          אישור פרטי החבילה והשלמת ההזמנה
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* פרטי החבילה */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              פרטי החבילה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">{packageDetails.name}</span>
              <span className="text-2xl font-bold text-blue-600">
                ₪{packageDetails.price}
                <span className="text-sm text-gray-500">
                  /{packageDetails.billingCycle === 'yearly' ? 'שנה' : 'חודש'}
                </span>
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4" />
              <span>עד {packageDetails.agents} נציגים</span>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">כולל:</h4>
              <ul className="space-y-1">
                {packageDetails.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* טופס תשלום דמה */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              פרטי תשלום
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">שם מלא</label>
                <input 
                  type="text" 
                  placeholder="שם מלא"
                  className="w-full p-2 border rounded-lg"
                  defaultValue={checkoutData?.managerName || "ישראל ישראלי"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">אימייל</label>
                <input 
                  type="email" 
                  placeholder="email@example.com"
                  className="w-full p-2 border rounded-lg"
                  defaultValue="demo@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">מספר כרטיס אשראי</label>
              <input 
                type="text" 
                placeholder="4580 1234 5678 9012"
                className="w-full p-2 border rounded-lg"
                defaultValue="4580 1234 5678 9012"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">תוקף</label>
                <input 
                  type="text" 
                  placeholder="MM/YY"
                  className="w-full p-2 border rounded-lg"
                  defaultValue="12/25"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CVV</label>
                <input 
                  type="text" 
                  placeholder="123"
                  className="w-full p-2 border rounded-lg"
                  defaultValue="123"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold">סה"כ לתשלום:</span>
                <div className="text-left">
                  <span className="text-2xl font-bold text-blue-600">
                    ₪{packageDetails.price}
                  </span>
                  <div className="text-sm text-gray-500">
                    {packageDetails.billingCycle === 'yearly' ? 'חיוב שנתי' : 'חיוב חודשי'}
                    {packageDetails.billingCycle === 'yearly' && (
                      <span className="text-green-600 font-medium mr-2">חיסכון של 2 חודשים!</span>
                    )}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    מעבד תשלום...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    השלם הזמנה
                  </div>
                )}
              </Button>
            </div>

            <div className="text-xs text-gray-500 text-center">
              🔒 תשלום מאובטח - מתבצעת סליקה הדמה לצורכי בדיקה
            </div>
          </CardContent>
        </Card>
      </div>

      {/* הודעת מידע */}
      <Card className="mt-8 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="font-semibold">מצב בדיקה פעיל</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            זהו סביבת פיתוח. התשלום מתבצע באמצעות מערכת סליקה הדמה ולא יגבה חיוב אמיתי מכרטיס האשראי.
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 