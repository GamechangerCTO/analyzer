'use client'

// Force dynamic rendering for this page due to useSearchParams
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
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

function CheckoutDemoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState<'details' | 'payment' | 'success'>('details')
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const dataParam = searchParams.get('data')
      if (dataParam) {
        const parsedData = JSON.parse(dataParam)
        setCheckoutData(parsedData)
      } else {
        router.push('/subscription-setup')
      }
    } catch (error) {
      console.error('Error parsing checkout data:', error)
      router.push('/subscription-setup')
    } finally {
      setLoading(false)
    }
  }, [searchParams, router])

  const handlePayment = async () => {
    if (!checkoutData) return

    setIsProcessing(true)
    setCurrentStep('payment')

    try {
      // סימולציה של תהליך תשלום
      await new Promise(resolve => setTimeout(resolve, 3000))

      // יצירת מנוי במסד הנתונים
      const { error: subscriptionError } = await supabase
        .from('company_subscriptions')
        .insert({
          company_id: checkoutData.companyId,
          plan_id: checkoutData.planId,
          is_active: true,
          agents_count: checkoutData.maxAgents,
          starts_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })

      if (subscriptionError) {
        throw new Error('שגיאה ביצירת המנוי')
      }

      setCurrentStep('success')
    } catch (error) {
      console.error('Payment error:', error)
      alert('שגיאה בעיבוד התשלום')
      setCurrentStep('details')
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-bg via-brand-bg-light to-brand-accent-light flex items-center justify-center">
        <div className="coachee-card p-8 max-w-md w-full mx-4">
          <div className="animate-pulse text-center">
            <div className="w-16 h-16 bg-brand-primary rounded-3xl mx-auto mb-4"></div>
            <div className="h-4 bg-brand-primary rounded-xl mb-2"></div>
            <div className="h-3 bg-brand-secondary rounded-xl w-3/4 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!checkoutData) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-bg via-brand-bg-light to-brand-accent-light p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">השלמת רכישה</h1>
        
        {currentStep === 'details' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* פרטי החבילה */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  פרטי החבילה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="font-semibold">שם החבילה:</span>
                  <span className="ml-2">{checkoutData.planName}</span>
                </div>
                <div>
                  <span className="font-semibold">מחיר:</span>
                  <span className="ml-2 text-2xl font-bold text-brand-primary">
                    ${checkoutData.price}
                  </span>
                  <span className="text-sm text-gray-500">
                    /{checkoutData.billingCycle === 'yearly' ? 'שנה' : 'חודש'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>עד {checkoutData.maxAgents} נציגים</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>חיוב {checkoutData.billingCycle === 'yearly' ? 'שנתי' : 'חודשי'}</span>
                </div>
              </CardContent>
            </Card>

            {/* פרטי החברה */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  פרטי החברה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="font-semibold">שם החברה:</span>
                  <span className="ml-2">{checkoutData.companyName}</span>
                </div>
                <div>
                  <span className="font-semibold">מנהל:</span>
                  <span className="ml-2">{checkoutData.managerName}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 'payment' && (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="text-center">
                <CreditCard className="w-16 h-16 text-brand-primary mx-auto mb-4 animate-pulse" />
                <h2 className="text-xl font-bold mb-2">מעבד תשלום...</h2>
                <p className="text-gray-600">אנא המתינו, התשלום בביצוע</p>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'success' && (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-brand-success mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">תשלום בוצע בהצלחה!</h2>
                <p className="text-gray-600 mb-6">
                  החבילה שלכם פעילה והמערכת מוכנה לשימוש
                </p>
                <Button 
                  onClick={() => router.push('/dashboard')}
                  className="w-full"
                >
                  עבור לדשבורד
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'details' && (
          <div className="mt-8 text-center">
            <Button 
              onClick={handlePayment}
              disabled={isProcessing}
              size="lg"
              className="px-8"
            >
              {isProcessing ? 'מעבד...' : `שלם ${checkoutData.price}$`}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CheckoutDemoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-brand-bg via-brand-bg-light to-brand-accent-light flex items-center justify-center">
        <div className="coachee-card p-8 max-w-md w-full mx-4">
          <div className="animate-pulse text-center">
            <div className="w-16 h-16 bg-brand-primary rounded-3xl mx-auto mb-4"></div>
            <div className="h-4 bg-brand-primary rounded-xl mb-2"></div>
            <div className="h-3 bg-brand-secondary rounded-xl w-3/4 mx-auto"></div>
          </div>
        </div>
      </div>
    }>
      <CheckoutDemoContent />
    </Suspense>
  )
} 