'use client'

import React, { useState, useEffect } from 'react'
import { X, CreditCard, Package, Percent, CheckCircle2, DollarSign, Users, Star, Zap, Shield, Clock } from 'lucide-react'

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-glacier-neutral-200/50 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-glacier-primary to-glacier-primary-dark p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">רכישת חבילה</h2>
                <p className="text-glacier-primary-100 text-sm">{pkg.name}</p>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors duration-200"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6">
          
          {/* Package Step */}
          {currentStep === 'package' && (
            <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
              
              {/* Package Info */}
              <div className="bg-gradient-to-r from-glacier-accent-50 to-glacier-secondary-50 border border-glacier-accent-200 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-2">{pkg.name}</h3>
                    <p className="text-glacier-neutral-600">{pkg.description}</p>
                  </div>
                  {pkg.is_popular && (
                    <div className="bg-glacier-warning text-white px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      פופולרי
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-glacier-neutral-700">
                    <Users className="w-4 h-4 text-glacier-primary" />
                    <span className="text-sm">עד {pkg.users_count} משתמשים</span>
                  </div>
                  <div className="flex items-center gap-2 text-glacier-neutral-700">
                    <Shield className="w-4 h-4 text-glacier-accent" />
                    <span className="text-sm">תמיכה מלאה</span>
                  </div>
                </div>

                {/* Price */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-glacier-primary mb-1">
                    ₪{pkg.base_price.toLocaleString()}
                  </div>
                  <div className="text-glacier-neutral-500 text-sm">תשלום חודשי</div>
                </div>
              </div>

              {/* Continue Button */}
              <button
                onClick={() => setCurrentStep('discount')}
                className="w-full px-6 py-4 bg-gradient-to-r from-glacier-primary to-glacier-primary-dark text-white font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] transform-gpu shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <span>המשך לתשלום</span>
                <Zap className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Discount Step */}
          {currentStep === 'discount' && (
            <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
              
              {/* Discount Code */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Percent className="w-5 h-5 text-glacier-warning" />
                  קוד הנחה (אופציונלי)
                </h3>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="הכנס קוד הנחה..."
                    className="flex-1 p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg"
                  />
                  <button
                    onClick={handleApplyDiscount}
                    className="px-6 py-4 bg-glacier-accent hover:bg-glacier-accent-dark text-white font-medium rounded-xl transition-all duration-300 hover:scale-[1.02] transform-gpu"
                  >
                    החל
                  </button>
                </div>

                {/* Applied Discount */}
                {appliedDiscount && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-glacier-success-50 border border-green-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-green-700 font-medium">
                          הנחה הוחלה: {appliedDiscount.name}
                        </span>
                      </div>
                      <button
                        onClick={removeDiscount}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Price Summary */}
              <div className="bg-glacier-neutral-50 rounded-xl p-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-glacier-neutral-600">מחיר בסיס:</span>
                  <span className="font-medium">₪{pkg.base_price.toLocaleString()}</span>
                </div>
                
                {appliedDiscount && (
                  <div className="flex justify-between items-center text-green-600">
                    <span>הנחה ({appliedDiscount.discount_type === 'percentage' ? `${appliedDiscount.discount_value}%` : `₪${appliedDiscount.discount_value}`}):</span>
                    <span className="font-medium">-₪{getSavingsAmount().toLocaleString()}</span>
                  </div>
                )}
                
                <div className="border-t border-glacier-neutral-200 pt-3">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>סה"כ לתשלום:</span>
                    <span className="text-glacier-primary">₪{calculateFinalPrice().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('package')}
                  className="flex-1 px-6 py-4 bg-glacier-neutral-200 hover:bg-glacier-neutral-300 text-glacier-neutral-700 font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] transform-gpu"
                >
                  חזור
                </button>
                <button
                  onClick={() => setCurrentStep('payment')}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-glacier-primary to-glacier-primary-dark text-white font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] transform-gpu shadow-lg hover:shadow-xl"
                >
                  המשך
                </button>
              </div>
            </div>
          )}

          {/* Payment Step */}
          {currentStep === 'payment' && (
            <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
              
              {/* Payment Method */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-glacier-primary" />
                  אמצעי תשלום
                </h3>
                
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'credit', label: 'כרטיס אשראי', icon: CreditCard },
                    { id: 'paypal', label: 'PayPal', icon: DollarSign },
                    { id: 'bank', label: 'העברה בנקאית', icon: Shield }
                  ].map(({ id, label, icon: Icon }) => (
                    <label key={id} className="relative">
                      <input
                        type="radio"
                        name="payment_method"
                        value={id}
                        checked={paymentMethod === id}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="sr-only"
                      />
                      <div className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                        paymentMethod === id
                          ? 'border-glacier-primary bg-glacier-primary-light text-glacier-primary-600 shadow-lg'
                          : 'border-glacier-neutral-200 bg-white hover:border-glacier-primary-light hover:shadow-md'
                      }`}>
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5" />
                          <span className="font-medium">{label}</span>
                          {paymentMethod === id && (
                            <CheckCircle2 className="w-5 h-5 text-glacier-primary mr-auto" />
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Credit Card Form */}
              {paymentMethod === 'credit' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-glacier-neutral-700">מספר כרטיס</label>
                      <input
                        type="text"
                        value={creditCardData.number}
                        onChange={(e) => setCreditCardData({...creditCardData, number: e.target.value})}
                        placeholder="1234 5678 9012 3456"
                        className="w-full p-3 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-glacier-neutral-700">תוקף</label>
                        <input
                          type="text"
                          value={creditCardData.expiry}
                          onChange={(e) => setCreditCardData({...creditCardData, expiry: e.target.value})}
                          placeholder="MM/YY"
                          className="w-full p-3 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-glacier-neutral-700">CVV</label>
                        <input
                          type="text"
                          value={creditCardData.cvv}
                          onChange={(e) => setCreditCardData({...creditCardData, cvv: e.target.value})}
                          placeholder="123"
                          className="w-full p-3 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-glacier-neutral-700">שם בעל הכרטיס</label>
                      <input
                        type="text"
                        value={creditCardData.name}
                        onChange={(e) => setCreditCardData({...creditCardData, name: e.target.value})}
                        placeholder="שם מלא"
                        className="w-full p-3 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Final Price */}
              <div className="bg-gradient-to-r from-glacier-primary-50 to-glacier-accent-50 border border-glacier-primary-200 rounded-xl p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-glacier-primary mb-2">
                    ₪{calculateFinalPrice().toLocaleString()}
                  </div>
                  <div className="text-glacier-neutral-600 text-sm">תשלום חודשי עבור {pkg.users_count} משתמשים</div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('discount')}
                  className="flex-1 px-6 py-4 bg-glacier-neutral-200 hover:bg-glacier-neutral-300 text-glacier-neutral-700 font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] transform-gpu"
                >
                  חזור
                </button>
                <button
                  onClick={handlePayment}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] transform-gpu shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  <span>שלם עכשיו</span>
                </button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {currentStep === 'processing' && (
            <div className="text-center py-12 animate-in slide-in-from-bottom duration-500">
              <div className="w-16 h-16 bg-glacier-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">מעבד תשלום...</h3>
              <p className="text-glacier-neutral-600">אנא המתן, מעבדים את התשלום שלך</p>
            </div>
          )}

          {/* Success Step */}
          {currentStep === 'success' && (
            <div className="text-center py-12 animate-in slide-in-from-bottom duration-500">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">תשלום הושלם בהצלחה!</h3>
              <p className="text-glacier-neutral-600 mb-4">תודה על הרכישה. החבילה שלך מופעלת כעת.</p>
              
              <div className="flex items-center justify-center gap-2 text-glacier-neutral-500">
                <Clock className="w-4 h-4" />
                <span className="text-sm">חוזר אוטומטית בעוד {countdown} שניות</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 