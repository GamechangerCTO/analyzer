'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
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
    id: 'basic',
    name: 'BASIC',
    users: 3, // ממוצע יוזרים בחברה
    price: 29, // מחיר חודשי למשתמש בדולרים
    description: 'ניתוחי שיחות, דוחות - מחיר למשתמש לחודש'
  },
  {
    id: 'professional',
    name: 'PROFESSIONAL',
    users: 3, // ממוצע יוזרים בחברה
    price: 89, // מחיר חודשי למשתמש בדולרים
    description: 'ניתוחי שיחות, דוחות, סימולציות - מחיר למשתמש לחודש',
    popular: true
  },
  {
    id: 'premium',
    name: 'PREMIUM',
    users: 3, // ממוצע יוזרים בחברה
    price: 109, // מחיר חודשי למשתמש בדולרים
    description: 'ניתוחי שיחות, דוחות, סימולציות, יועץ מלווה שעה בחודש - מחיר למשתמש לחודש'
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly') // תמחור חודשי/שנתי
  const [userCount, setUserCount] = useState(3) // ברירת מחדל 3 משתמשים

  const supabase = createClient()

  // פונקציה לחישוב מחיר לפי מספר משתמשים וסוג תמחור
  const calculatePrice = (packagePrice: number, users: number, period: 'monthly' | 'yearly') => {
    const totalMonthlyPrice = packagePrice * users
    if (period === 'yearly') {
      // 15% הנחה על תמחור שנתי
      const yearlyPrice = totalMonthlyPrice * 12
      const discountedPrice = yearlyPrice * 0.85 // 15% הנחה
      return Math.round(discountedPrice)
    }
    return totalMonthlyPrice
  }

  // פונקציה לחישוב חיסכון שנתי
  const calculateYearlySavings = (packagePrice: number, users: number) => {
    const monthlyTotal = packagePrice * users * 12
    const yearlyTotal = calculatePrice(packagePrice, users, 'yearly')
    return monthlyTotal - yearlyTotal
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      // קבלת המשתמש הנוכחי
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Error getting user:', userError)
        setSuccessMessage('❌ שגיאה באימות המשתמש')
        setTimeout(() => setSuccessMessage(null), 3000)
        return
      }

      if (!user) {
        console.error('No user found')
        setSuccessMessage('❌ משתמש לא מחובר')
        setTimeout(() => setSuccessMessage(null), 3000)
        return
      }

      // קבלת פרטי המשתמש
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (userDataError) {
        console.error('Error getting user data:', userDataError)
        setSuccessMessage('❌ שגיאה בקבלת נתוני המשתמש')
        setTimeout(() => setSuccessMessage(null), 3000)
        return
      }

      if (!userData || !userData.company_id) {
        console.error('User data incomplete:', userData)
        setSuccessMessage('❌ נתוני המשתמש לא שלמים')
        setTimeout(() => setSuccessMessage(null), 3000)
        return
      }

      setUserInfo({
        userId: user.id,
        companyId: userData.company_id
      })

      // קבלת מכסה נוכחית עם retry mechanism
      let retryCount = 0
      const maxRetries = 3
      
      while (retryCount < maxRetries) {
        try {
          const { data: quotaData, error: quotaError } = await supabase
            .rpc('get_company_user_quota', { p_company_id: userData.company_id })

          if (quotaError) {
            console.error(`Error getting quota (attempt ${retryCount + 1}):`, quotaError)
            if (retryCount === maxRetries - 1) {
              setSuccessMessage('❌ שגיאה בקבלת נתוני המכסה')
              setTimeout(() => setSuccessMessage(null), 3000)
            }
            retryCount++
            await new Promise(resolve => setTimeout(resolve, 1000)) // המתנה של שנייה
            continue
          }

          if (quotaData && quotaData.length > 0) {
            setCurrentQuota(quotaData[0])
          }
          break // יציאה מהלולאה אם הצלחנו
        } catch (error) {
          console.error(`Quota fetch error (attempt ${retryCount + 1}):`, error)
          retryCount++
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }

    } catch (error) {
      console.error('Error fetching user data:', error)
      setSuccessMessage('❌ שגיאה כללית בטעינת הנתונים')
      setTimeout(() => setSuccessMessage(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchaseClick = (packageId: string) => {
    const selectedPkg = quotaPackages.find(pkg => pkg.id === packageId)
    if (!selectedPkg) return

    // חישוב המחיר הסופי
    const totalPrice = calculatePrice(selectedPkg.price, userCount, billingPeriod)

    // המרת הפורמט לפורמט של הפופאפ
    const paymentPackage = {
      id: selectedPkg.id,
      name: `${selectedPkg.name} - ${userCount} משתמשים (${billingPeriod === 'monthly' ? 'חודשי' : 'שנתי'})`,
      users_count: userCount,
      base_price: totalPrice,
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
        setSuccessMessage('✅ הרכישה הושלמה בהצלחה! המכסה שלכם תעודכן תוך מספר דקות.')
        // רענון הנתונים
        fetchUserData()
        // סגירה אוטומטית לאחר 3 שניות
        setTimeout(() => {
          setSuccessMessage(null)
        }, 3000)
      } else {
        throw new Error(result.error || 'שגיאה בעיבוד הרכישה')
      }

    } catch (error) {
      console.error('Error processing purchase:', error)
      const errorMessage = '❌ שגיאה בעיבוד הרכישה: ' + (error as Error).message
      setSuccessMessage(errorMessage)
      // סגירה אוטומטית לאחר 3 שניות
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
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
        setSuccessMessage('✅ בקשה לרכישת מכסה נשלחה בהצלחה! נחזור אליכם בהקדם עם פרטי התשלום.')
        // סגירה אוטומטית לאחר 3 שניות
        setTimeout(() => {
          setSuccessMessage(null)
        }, 3000)
      } else {
        throw new Error(result.error || 'שגיאה בשליחת הבקשה')
      }

    } catch (error) {
      console.error('Error purchasing quota:', error)
      const errorMessage = '❌ שגיאה בשליחת הבקשה: ' + (error as Error).message
      setSuccessMessage(errorMessage)
      // סגירה אוטומטית לאחר 3 שניות
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
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
      {/* הודעת הצלחה/שגיאה */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 max-w-md">
          <div className="flex items-start">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-3 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4">
        {/* כותרת */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">בחירת חבילת תמחור</h1>
          <p className="text-lg text-gray-600 mb-6">בחרו חבילה המתאימה לכם - מינימום 2 משתמשים</p>
          
          {/* בורר תמחור */}
          <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl mx-auto mb-6">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  billingPeriod === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                תמחור חודשי
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors relative ${
                  billingPeriod === 'yearly'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                תמחור שנתי
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                  15% הנחה
                </span>
              </button>
            </div>
            
            {/* בורר מספר משתמשים */}
            <div className="flex items-center justify-center space-x-4">
              <label className="font-medium text-gray-700">מספר משתמשים:</label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setUserCount(Math.max(2, userCount - 1))}
                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center"
                >
                  -
                </button>
                <span className="w-12 text-center font-bold text-lg">{userCount}</span>
                <button
                  onClick={() => setUserCount(userCount + 1)}
                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {quotaPackages.map((pkg) => {
            const totalPrice = calculatePrice(pkg.price, userCount, billingPeriod)
            const yearlySavings = calculateYearlySavings(pkg.price, userCount)
            
            return (
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
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{pkg.name}</h3>
                  
                  {/* מחיר */}
                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      ${totalPrice.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {billingPeriod === 'monthly' ? 'לחודש' : 'לשנה'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      ${pkg.price} למשתמש {billingPeriod === 'monthly' ? 'לחודש' : 'לשנה ($' + Math.round(pkg.price * 0.85) + ' עם הנחה)'}
                    </div>
                    {billingPeriod === 'yearly' && yearlySavings > 0 && (
                      <div className="text-sm text-green-600 font-medium mt-2">
                        💰 חוסכים ${yearlySavings.toLocaleString()} בשנה!
                      </div>
                    )}
                  </div>
                  
                  {/* תכונות */}
                  <div className="space-y-3 mb-6">
                    <h4 className="font-semibold text-gray-800">מה כולל:</h4>
                    {pkg.id === 'basic' && (
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>✅ ניתוחי שיחות</li>
                        <li>✅ דוחות</li>
                      </ul>
                    )}
                    {pkg.id === 'professional' && (
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>✅ ניתוחי שיחות</li>
                        <li>✅ דוחות</li>
                        <li>✅ סימולציות</li>
                      </ul>
                    )}
                    {pkg.id === 'premium' && (
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>✅ ניתוחי שיחות</li>
                        <li>✅ דוחות</li>
                        <li>✅ סימולציות</li>
                        <li>✅ יועץ מלווה שעה בחודש</li>
                      </ul>
                    )}
                  </div>
                  
                  {/* פרטי הזמנה */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-600 text-center">
                      {userCount} משתמשים × ${pkg.price} = ${(pkg.price * userCount).toLocaleString()} {billingPeriod === 'monthly' ? 'לחודש' : 'לשנה'}
                      {billingPeriod === 'yearly' && (
                        <span className="block text-green-600 font-medium">
                          עם 15% הנחה: ${totalPrice.toLocaleString()}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => handlePurchaseClick(pkg.id)}
                      className="w-full py-3 px-4 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      💳 בחר חבילה זו
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* מידע נוסף */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">❓ שאלות נפוצות</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">איך עובד התמחור החדש?</h4>
              <p className="text-gray-600 text-sm">המחיר הוא למשתמש לחודש. מינימום 2 משתמשים. תמחור שנתי כולל 15% הנחה. ממוצע יוזרים בחברה הוא 3.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">מה ההבדל בין החבילות?</h4>
              <p className="text-gray-600 text-sm">BASIC כולל ניתוחי שיחות ודוחות. PROFESSIONAL מוסיף סימולציות. PREMIUM מוסיף יועץ מלווה שעה בחודש.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">מה יותר כדאי - חודשי או שנתי?</h4>
              <p className="text-gray-600 text-sm">תמחור שנתי חוסך 15% הנחה מהמחיר החודשי, ומתאים לחברות שמחויבות לטווח הארוך.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">איך מוסיפים או מחסירים משתמשים?</h4>
              <p className="text-gray-600 text-sm">ניתן לשנות את מספר המשתמשים בכל עת בהתאם לצרכי החברה. החיוב יתעדכן בהתאם.</p>
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