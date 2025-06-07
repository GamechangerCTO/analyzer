'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { Database } from '@/types/database.types'
import PaymentModal from '@/components/PaymentModal'

interface QuotaPackage {
  id: string
  name: string
  users: number
  price: number
  description: string
  popular?: boolean
}

interface PaymentPackage {
  id: string
  name: string
  users_count: number
  base_price: number
  description: string
  is_popular: boolean
}

const quotaPackages: QuotaPackage[] = [
  {
    id: 'small',
    name: 'חבילה קטנה',
    users: 5,
    price: 299,
    description: '5 משתמשים נוספים למכסה הקיימת'
  },
  {
    id: 'medium',
    name: 'חבילה בינונית',
    users: 10,
    price: 499,
    description: '10 משתמשים נוספים למכסה הקיימת',
    popular: true
  },
  {
    id: 'large',
    name: 'חבילה גדולה',
    users: 20,
    price: 899,
    description: '20 משתמשים נוספים למכסה הקיימת'
  },
  {
    id: 'enterprise',
    name: 'חבילה ארגונית',
    users: 50,
    price: 1999,
    description: '50 משתמשים נוספים למכסה הקיימת'
  }
]

export default function PurchaseQuotaPage() {
  const [currentQuota, setCurrentQuota] = useState<{total_users: number, used_users: number, available_users: number} | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [userInfo, setUserInfo] = useState<{userId: string, companyId: string} | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPackageForPayment, setSelectedPackageForPayment] = useState<PaymentPackage | null>(null)

  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      // קבלת המשתמש הנוכחי
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('Error getting user:', userError)
        return
      }

      // קבלת פרטי המשתמש
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (userDataError || !userData || !userData.company_id) {
        console.error('Error getting user data:', userDataError)
        return
      }

      setUserInfo({
        userId: user.id,
        companyId: userData.company_id
      })

      // קבלת מכסה נוכחית
      const { data: quotaData, error: quotaError } = await supabase
        .rpc('get_company_user_quota', { p_company_id: userData.company_id })

      if (quotaError) {
        console.error('Error getting quota:', quotaError)
      } else if (quotaData && quotaData.length > 0) {
        setCurrentQuota(quotaData[0])
      }

    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchaseClick = (packageId: string) => {
    const selectedPkg = quotaPackages.find(pkg => pkg.id === packageId)
    if (!selectedPkg) return

    // המרת הפורמט לפורמט של הפופאפ
    const paymentPackage = {
      id: selectedPkg.id,
      name: selectedPkg.name,
      users_count: selectedPkg.users,
      base_price: selectedPkg.price,
      description: selectedPkg.description,
      is_popular: selectedPkg.popular || false
    }

    setSelectedPackageForPayment(paymentPackage)
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = async (paymentData: any) => {
    if (!userInfo) return

    try {
      // שליחת הזמנה לאדמין עם פרטי התשלום
      const response = await fetch('/api/quota/purchase-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: paymentData.package_id,
          packageName: paymentData.package_name,
          additionalUsers: paymentData.users_count,
          price: paymentData.final_price,
          originalPrice: paymentData.original_price,
          discount: paymentData.discount_applied,
          savings: paymentData.savings,
          paymentMethod: paymentData.payment_method,
          transactionId: paymentData.transaction_id,
          companyId: userInfo.companyId,
          requestedBy: userInfo.userId,
          isPaid: true // מסמן שהתשלום בוצע
        })
      })

      const result = await response.json()

      if (response.ok) {
        setShowPaymentModal(false)
        setSelectedPackageForPayment(null)
        alert('✅ הרכישה הושלמה בהצלחה! המכסה שלכם תעודכן תוך מספר דקות.')
        // רענון הנתונים
        fetchUserData()
      } else {
        throw new Error(result.error || 'שגיאה בעיבוד הרכישה')
      }

    } catch (error) {
      console.error('Error processing purchase:', error)
      alert('❌ שגיאה בעיבוד הרכישה: ' + (error as Error).message)
    }
  }

  const handlePurchase = async (packageId: string) => {
    if (!userInfo || !currentQuota) return

    setPurchasing(true)
    setSelectedPackage(packageId)

    try {
      const selectedPkg = quotaPackages.find(pkg => pkg.id === packageId)
      if (!selectedPkg) return

      // בקשה ישירה לאדמין ללא תשלום (המודל הישן)
      const response = await fetch('/api/quota/purchase-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: packageId,
          packageName: selectedPkg.name,
          additionalUsers: selectedPkg.users,
          price: selectedPkg.price,
          companyId: userInfo.companyId,
          requestedBy: userInfo.userId
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert('✅ בקשה לרכישת מכסה נשלחה בהצלחה! נחזור אליכם בהקדם עם פרטי התשלום.')
      } else {
        throw new Error(result.error || 'שגיאה בשליחת הבקשה')
      }

    } catch (error) {
      console.error('Error purchasing quota:', error)
      alert('❌ שגיאה בשליחת הבקשה: ' + (error as Error).message)
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* כותרת */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">רכישת מכסת משתמשים</h1>
          <p className="text-lg text-gray-600 mb-6">הגדילו את מכסת המשתמשים שלכם כדי להוסיף עוד נציגים לחברה</p>
          
          {/* מכסה נוכחית */}
          {currentQuota && (
            <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">המכסה הנוכחית שלכם</h3>
              <div className="text-3xl font-bold text-blue-600">
                {currentQuota.used_users}/{currentQuota.total_users}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                זמינים: {currentQuota.available_users} משתמשים
              </p>
              <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(currentQuota.used_users / currentQuota.total_users) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* חבילות */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quotaPackages.map((pkg) => (
            <div 
              key={pkg.id}
              className={`bg-white rounded-xl shadow-lg border-2 transition-all duration-300 ${
                pkg.popular ? 'border-blue-500 scale-105' : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              {pkg.popular && (
                <div className="bg-blue-500 text-white text-center py-2 text-sm font-medium rounded-t-xl">
                  🔥 הכי פופולרי
                </div>
              )}
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  ₪{pkg.price.toLocaleString()}
                </div>
                <div className="text-lg text-gray-600 mb-4">
                  +{pkg.users} משתמשים
                </div>
                <p className="text-sm text-gray-500 mb-6">{pkg.description}</p>
                
                {currentQuota && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-600">
                      מכסה חדשה: <span className="font-semibold">{currentQuota.total_users + pkg.users}</span> משתמשים
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    onClick={() => handlePurchaseClick(pkg.id)}
                    className="w-full py-3 px-4 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
                  >
                    💳 רכוש ושלם מיד
                  </button>
                  <button
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={purchasing}
                    className={`w-full py-2 px-4 rounded-lg text-sm transition-colors ${
                      purchasing && selectedPackage === pkg.id
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {purchasing && selectedPackage === pkg.id ? 'שולח בקשה...' : '📧 שלח בקשה לאדמין'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* מידע נוסף */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">❓ שאלות נפוצות</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">איך עובד התשלום?</h4>
              <p className="text-gray-600 text-sm">לאחר בחירת חבילה, נשלח אליכם פרטי תשלום ונחכה לאישור התשלום לפני הפעלת המכסה הנוספת.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">מתי המכסה תתעדכן?</h4>
              <p className="text-gray-600 text-sm">המכסה הנוספת תתווסף למכסה הקיימת מיד לאחר אישור התשלום, בדרך כלל תוך 24 שעות.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">האם יש הנחות לחבילות גדולות?</h4>
              <p className="text-gray-600 text-sm">כן! ככל שהחבילה גדולה יותר, המחיר למשתמש יוצא זול יותר. לחבילות מעל 50 משתמשים נא לפנות אלינו.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">אפשר לבטל או להחזיר?</h4>
              <p className="text-gray-600 text-sm">המכסה רכש חד-פעמי ולא ניתן להחזרה. המכסה תישאר פעילה כל עוד החשבון פעיל.</p>
            </div>
          </div>
        </div>

        {/* כפתורי ניווט */}
        <div className="text-center">
          <Link 
            href="/team"
            className="inline-flex items-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors mr-4"
          >
            ← חזרה לניהול צוות
          </Link>
          <Link 
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            חזרה לדשבורד
          </Link>
        </div>
      </div>

      {/* פופאפ תשלום */}
      {selectedPackageForPayment && (
        <PaymentModal
          package={selectedPackageForPayment}
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedPackageForPayment(null)
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
} 