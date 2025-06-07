'use client'

import React, { useState, useEffect } from 'react'

interface PaymentPackage {
  id: string
  name: string
  users_count: number
  base_price: number
  description: string
  is_popular: boolean
}

interface Discount {
  id: string
  name: string
  discount_code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_package_price: number
}

interface PaymentModalProps {
  package: PaymentPackage
  isOpen: boolean
  onClose: () => void
  onSuccess: (paymentData: any) => void
}

export default function PaymentModal({ package: pkg, isOpen, onClose, onSuccess }: PaymentModalProps) {
  const [currentStep, setCurrentStep] = useState<'package' | 'discount' | 'payment' | 'processing' | 'success'>('package')
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'paypal' | 'bank'>('credit')
  const [creditCardData, setCreditCardData] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  })
  const [countdown, setCountdown] = useState(3)

  // הנחות זמינות (פיקטיביות)
  const availableDiscounts: Discount[] = [
    {
      id: '1',
      name: 'הנחת השקה',
      discount_code: 'LAUNCH20',
      discount_type: 'percentage',
      discount_value: 20,
      min_package_price: 200
    },
    {
      id: '2',
      name: 'הנחה לחברות גדולות',
      discount_code: 'ENTERPRISE15',
      discount_type: 'percentage',
      discount_value: 15,
      min_package_price: 800
    },
    {
      id: '3',
      name: 'הנחה קבועה',
      discount_code: 'SAVE50',
      discount_type: 'fixed',
      discount_value: 50,
      min_package_price: 100
    }
  ]

  const calculateFinalPrice = () => {
    let finalPrice = pkg.base_price
    
    if (appliedDiscount) {
      if (appliedDiscount.discount_type === 'percentage') {
        finalPrice = finalPrice * (1 - appliedDiscount.discount_value / 100)
      } else {
        finalPrice = finalPrice - appliedDiscount.discount_value
      }
    }
    
    return Math.max(0, finalPrice)
  }

  const getSavingsAmount = () => {
    if (!appliedDiscount) return 0
    
    if (appliedDiscount.discount_type === 'percentage') {
      return pkg.base_price * (appliedDiscount.discount_value / 100)
    } else {
      return appliedDiscount.discount_value
    }
  }

  const handleApplyDiscount = () => {
    const discount = availableDiscounts.find(d => 
      d.discount_code.toLowerCase() === discountCode.toLowerCase() &&
      pkg.base_price >= d.min_package_price
    )
    
    if (discount) {
      setAppliedDiscount(discount)
      // הודעה זמנית במקום alert
      const successDiv = document.createElement('div')
      successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
      successDiv.textContent = `✅ הקוד ${discount.discount_code} הוחל בהצלחה!`
      document.body.appendChild(successDiv)
      setTimeout(() => {
        document.body.removeChild(successDiv)
      }, 3000)
    } else {
      // הודעת שגיאה זמנית במקום alert
      const errorDiv = document.createElement('div')
      errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
      errorDiv.textContent = '❌ קוד הנחה לא תקין או לא זמין עבור חבילה זו'
      document.body.appendChild(errorDiv)
      setTimeout(() => {
        document.body.removeChild(errorDiv)
      }, 3000)
    }
  }

  const removeDiscount = () => {
    setAppliedDiscount(null)
    setDiscountCode('')
  }

  const handlePayment = async () => {
    setCurrentStep('processing')
    
    // סימולציה של תהליך תשלום
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const paymentData = {
      package_id: pkg.id,
      package_name: pkg.name,
      users_count: pkg.users_count,
      original_price: pkg.base_price,
      final_price: calculateFinalPrice(),
      discount_applied: appliedDiscount,
      savings: getSavingsAmount(),
      payment_method: paymentMethod,
      transaction_id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      payment_date: new Date().toISOString()
    }
    
    setCurrentStep('success')
    setCountdown(3)
  }

  // Countdown timer for success step
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (currentStep === 'success' && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
    } else if (currentStep === 'success' && countdown === 0) {
      // סגירה אוטומטית והעברת הנתונים
      const paymentData = {
        package_id: pkg.id,
        package_name: pkg.name,
        users_count: pkg.users_count,
        original_price: pkg.base_price,
        final_price: calculateFinalPrice(),
        discount_applied: appliedDiscount,
        savings: getSavingsAmount(),
        payment_method: paymentMethod,
        transaction_id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        payment_date: new Date().toISOString()
      }
      onSuccess(paymentData)
    }
    return () => clearTimeout(timer)
  }, [currentStep, countdown])

  const resetModal = () => {
    setCurrentStep('package')
    setDiscountCode('')
    setAppliedDiscount(null)
    setPaymentMethod('credit')
    setCreditCardData({
      number: '',
      expiry: '',
      cvv: '',
      name: ''
    })
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* כותרת */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            {currentStep === 'package' && '📦 סיכום חבילה'}
            {currentStep === 'discount' && '🎁 קוד הנחה'}
            {currentStep === 'payment' && '💳 פרטי תשלום'}
            {currentStep === 'processing' && '⏳ מעבד תשלום...'}
            {currentStep === 'success' && `✅ תשלום הושלם! (${countdown})`}
          </h2>
          {currentStep !== 'processing' && currentStep !== 'success' && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          )}
        </div>

        {/* תוכן */}
        <div className="p-6">
          {/* שלב 1: סיכום חבילה */}
          {currentStep === 'package' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">{pkg.name}</h3>
                  {pkg.is_popular && (
                    <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      🔥 פופולרי
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-3">{pkg.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{pkg.users_count} משתמשים</span>
                  <span className="text-2xl font-bold text-blue-600">₪{pkg.base_price.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-between text-sm text-gray-600">
                <span>עלות למשתמש:</span>
                <span>₪{(pkg.base_price / pkg.users_count).toFixed(0)}</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('discount')}
                  className="flex-1 px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                >
                  🎁 יש לי קוד הנחה
                </button>
                <button
                  onClick={() => setCurrentStep('payment')}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  המשך לתשלום
                </button>
              </div>
            </div>
          )}

          {/* שלב 2: קוד הנחה */}
          {currentStep === 'discount' && (
            <div className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2">🎁 הזן קוד הנחה</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="הזן קוד הנחה"
                    className="flex-1 px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono"
                  />
                  <button
                    onClick={handleApplyDiscount}
                    disabled={!discountCode.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors"
                  >
                    החל
                  </button>
                </div>
              </div>

              {appliedDiscount && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-blue-800">✅ הנחה הוחלה!</h4>
                    <button
                      onClick={removeDiscount}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      הסר
                    </button>
                  </div>
                  <p className="text-blue-700 text-sm mb-2">{appliedDiscount.name}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>מחיר מקורי:</span>
                      <span>₪{pkg.base_price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>חיסכון:</span>
                      <span>-₪{getSavingsAmount().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>מחיר סופי:</span>
                      <span>₪{calculateFinalPrice().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-800 text-sm mb-1">💡 קודי הנחה זמינים (לדוגמה):</h4>
                <div className="text-xs text-yellow-700 space-y-1">
                  <div>• LAUNCH20 - 20% הנחה (מחיר מינימלי ₪200)</div>
                  <div>• ENTERPRISE15 - 15% הנחה (מחיר מינימלי ₪800)</div>
                  <div>• SAVE50 - ₪50 הנחה (מחיר מינימלי ₪100)</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('package')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  ← חזור
                </button>
                <button
                  onClick={() => setCurrentStep('payment')}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  המשך לתשלום
                </button>
              </div>
            </div>
          )}

          {/* שלב 3: פרטי תשלום */}
          {currentStep === 'payment' && (
            <div className="space-y-6">
              {/* סיכום הזמנה */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">📋 סיכום הזמנה</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{pkg.name} ({pkg.users_count} משתמשים)</span>
                    <span>₪{pkg.base_price.toLocaleString()}</span>
                  </div>
                  {appliedDiscount && (
                    <div className="flex justify-between text-green-600">
                      <span>הנחה ({appliedDiscount.discount_code})</span>
                      <span>-₪{getSavingsAmount().toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>סה"כ לתשלום:</span>
                    <span>₪{calculateFinalPrice().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* בחירת אמצעי תשלום */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">💳 אמצעי תשלום</h3>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="credit"
                      checked={paymentMethod === 'credit'}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="mr-3"
                    />
                    <span>💳 כרטיס אשראי</span>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="paypal"
                      checked={paymentMethod === 'paypal'}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="mr-3"
                    />
                    <span>🅿️ PayPal</span>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="bank"
                      checked={paymentMethod === 'bank'}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="mr-3"
                    />
                    <span>🏦 העברה בנקאית</span>
                  </label>
                </div>
              </div>

              {/* פרטי כרטיס אשראי */}
              {paymentMethod === 'credit' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">פרטי כרטיס אשראי</h4>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">שם בעל הכרטיס</label>
                    <input
                      type="text"
                      value={creditCardData.name}
                      onChange={(e) => setCreditCardData({...creditCardData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="ישראל ישראלי"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">מספר כרטיס</label>
                    <input
                      type="text"
                      value={creditCardData.number}
                      onChange={(e) => setCreditCardData({...creditCardData, number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">תוקף</label>
                      <input
                        type="text"
                        value={creditCardData.expiry}
                        onChange={(e) => setCreditCardData({...creditCardData, expiry: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                        placeholder="MM/YY"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">CVV</label>
                      <input
                        type="text"
                        value={creditCardData.cvv}
                        onChange={(e) => setCreditCardData({...creditCardData, cvv: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                        placeholder="123"
                        maxLength={4}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* הודעות אמצעי תשלום אחרים */}
              {paymentMethod === 'paypal' && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-blue-800 text-sm">
                    🅿️ תועבר לאתר PayPal להשלמת התשלום
                  </p>
                </div>
              )}

              {paymentMethod === 'bank' && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-green-800 text-sm mb-2">
                    🏦 פרטי העברה בנקאית:
                  </p>
                  <div className="text-sm text-green-700 font-mono">
                    <div>בנק: בנק לאומי</div>
                    <div>סניף: 123</div>
                    <div>חשבון: 123456789</div>
                    <div>ב.ז.: 999999999</div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(appliedDiscount ? 'discount' : 'package')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  ← חזור
                </button>
                <button
                  onClick={handlePayment}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  💳 שלם ₪{calculateFinalPrice().toLocaleString()}
                </button>
              </div>
            </div>
          )}

          {/* שלב 4: עיבוד תשלום */}
          {currentStep === 'processing' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">מעבד תשלום...</h3>
              <div className="mt-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full w-full animate-pulse"></div>
                </div>
              </div>
            </div>
          )}

          {/* שלב 5: הצלחה */}
          {currentStep === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-4xl">✅</span>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">תשלום הושלם בהצלחה!</h3>
                <p className="text-gray-600">המכסה שלכם תעודכן בקרוב</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">פרטי הרכישה:</h4>
                <div className="text-sm text-green-700 space-y-1">
                  <div className="flex justify-between">
                    <span>חבילה:</span>
                    <span>{pkg.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>משתמשים:</span>
                    <span>{pkg.users_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>סכום שולם:</span>
                    <span>₪{calculateFinalPrice().toLocaleString()}</span>
                  </div>
                  {appliedDiscount && (
                    <div className="flex justify-between text-green-600">
                      <span>חיסכון:</span>
                      <span>₪{getSavingsAmount().toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-500">
                הפופאפ ייסגר אוטומטית בעוד {countdown} שניות...
              </div>

              <button
                onClick={() => {
                  const paymentData = {
                    package_id: pkg.id,
                    package_name: pkg.name,
                    users_count: pkg.users_count,
                    original_price: pkg.base_price,
                    final_price: calculateFinalPrice(),
                    discount_applied: appliedDiscount,
                    savings: getSavingsAmount(),
                    payment_method: paymentMethod,
                    transaction_id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                    payment_date: new Date().toISOString()
                  }
                  onSuccess(paymentData)
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                סגור עכשיו
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 