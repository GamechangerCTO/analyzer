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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="coachee-card-glass max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-white/30">
        
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-white/20">
            <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-glacier-primary to-glacier-primary-dark p-3 rounded-2xl">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
              <h2 className="text-2xl font-bold text-neutral-800">השלמת רכישה</h2>
              <p className="text-neutral-600">בחירת חבילה ותשלום</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-white/50 rounded-xl transition-all duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8">
          
          {/* Package Step */}
          {currentStep === 'package' && (
            <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
              
              {/* Package Info */}
              <div className="bg-gradient-to-r from-glacier-accent-50 to-glacier-secondary-50 border-2 border-glacier-accent-200 rounded-3xl p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-neutral-900 mb-3">{pkg.name}</h3>
                    <p className="text-glacier-neutral-600 leading-relaxed">{pkg.description}</p>
                  </div>
                  {pkg.is_popular && (
                    <div className="bg-gradient-to-r from-glacier-warning to-glacier-warning-dark text-white px-4 py-2 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-glacier-soft">
                      <Star className="w-4 h-4" />
                      פופולרי
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="flex items-center gap-3 text-glacier-neutral-700">
                    <div className="bg-gradient-to-r from-glacier-primary to-glacier-primary-dark p-2 rounded-xl">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium">עד {pkg.users_count} משתמשים</span>
                  </div>
                  <div className="flex items-center gap-3 text-glacier-neutral-700">
                    <div className="bg-gradient-to-r from-glacier-accent to-glacier-accent-dark p-2 rounded-xl">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium">תמיכה מלאה</span>
                  </div>
                </div>

                {/* Price */}
                <div className="text-center">
                  <div className="mb-4">
                    <span className="text-5xl font-bold bg-gradient-to-r from-glacier-primary-dark to-glacier-secondary-dark bg-clip-text text-transparent">
                      ${pkg.base_price}
                    </span>
                    <span className="text-neutral-500 text-xl mr-2">/חודש</span>
                  </div>
                  
                  {appliedDiscount && (
                    <div className="bg-gradient-to-r from-glacier-success/20 to-glacier-success/10 border border-glacier-success/30 rounded-2xl p-4 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-glacier-success-dark font-semibold">
                          הנחה: {appliedDiscount.name}
                        </span>
                        <span className="text-glacier-success-dark font-bold">
                          חיסכון: ${getSavingsAmount()}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="text-3xl font-bold text-neutral-800 mb-2">
                    מחיר סופי: ${calculateFinalPrice()}
                  </div>
                </div>
              </div>

              {/* Discount Section */}
              <div className="coachee-card p-6">
                <h4 className="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2">
                  <Percent className="w-5 h-5 text-glacier-accent" />
                  קוד הנחה (אופציונלי)
                </h4>
                
                {!appliedDiscount ? (
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      placeholder="הזינו קוד הנחה"
                      className="coachee-input flex-1"
                    />
                    <button
                      onClick={handleApplyDiscount}
                      disabled={!discountCode}
                      className="coachee-btn-secondary disabled:opacity-50"
                    >
                      החל הנחה
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-gradient-to-r from-glacier-success/10 to-glacier-success/5 border border-glacier-success/30 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-glacier-success-dark" />
                      <span className="text-glacier-success-dark font-medium">
                        קוד {appliedDiscount.discount_code} הוחל בהצלחה
                      </span>
                    </div>
                    <button
                      onClick={removeDiscount}
                      className="text-glacier-success-dark hover:text-red-600 transition-colors"
                    >
                      הסרה
                    </button>
                  </div>
                )}
              </div>

              {/* Continue Button */}
              <div className="text-center">
              <button
                  onClick={() => setCurrentStep('payment')}
                  className="coachee-btn-primary text-lg px-8 py-4"
              >
                  <CreditCard className="w-5 h-5" />
                  המשך לתשלום
                  <span className="font-bold">${calculateFinalPrice()}</span>
              </button>
              </div>
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
            <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
              
              {/* Order Summary */}
              <div className="coachee-card p-6">
                <h4 className="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-glacier-primary" />
                  סיכום הזמנה
                </h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">חבילה:</span>
                    <span className="font-semibold text-neutral-800">{pkg.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">מחיר בסיס:</span>
                    <span className="font-semibold text-neutral-800">${pkg.base_price}</span>
                  </div>
                  {appliedDiscount && (
                    <div className="flex justify-between text-glacier-success-dark">
                      <span>הנחה ({appliedDiscount.discount_code}):</span>
                      <span className="font-semibold">-${getSavingsAmount()}</span>
                    </div>
                  )}
                  <div className="border-t border-neutral-200 pt-3">
                    <div className="flex justify-between text-lg font-bold text-neutral-800">
                      <span>סה"כ לתשלום:</span>
                      <span className="text-glacier-primary-dark">${calculateFinalPrice()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="coachee-card p-6">
                <h4 className="text-lg font-bold text-neutral-800 mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-glacier-secondary" />
                  אמצעי תשלום
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {[
                    { id: 'credit', name: 'כרטיס אשראי', icon: CreditCard },
                    { id: 'paypal', name: 'PayPal', icon: DollarSign },
                    { id: 'bank', name: 'העברה בנקאית', icon: Shield }
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={`p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${
                        paymentMethod === method.id
                          ? 'border-glacier-primary bg-gradient-to-r from-glacier-primary/10 to-glacier-primary/5 text-glacier-primary-dark'
                          : 'border-neutral-200 hover:border-glacier-primary/50 text-neutral-600'
                      }`}
                    >
                      <method.icon className="w-6 h-6" />
                      <span className="font-medium text-sm">{method.name}</span>
                    </button>
                  ))}
              </div>

              {/* Credit Card Form */}
              {paymentMethod === 'credit' && (
                <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        מספר כרטיס
                      </label>
                      <input
                        type="text"
                        value={creditCardData.number}
                        onChange={(e) => setCreditCardData({...creditCardData, number: e.target.value})}
                        placeholder="1234 5678 9012 3456"
                        className="coachee-input"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          תוקף (MM/YY)
                        </label>
                        <input
                          type="text"
                          value={creditCardData.expiry}
                          onChange={(e) => setCreditCardData({...creditCardData, expiry: e.target.value})}
                          placeholder="12/25"
                          className="coachee-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          CVV
                        </label>
                        <input
                          type="text"
                          value={creditCardData.cvv}
                          onChange={(e) => setCreditCardData({...creditCardData, cvv: e.target.value})}
                          placeholder="123"
                          className="coachee-input"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        שם בעל הכרטיס
                      </label>
                      <input
                        type="text"
                        value={creditCardData.name}
                        onChange={(e) => setCreditCardData({...creditCardData, name: e.target.value})}
                        placeholder="ישראל ישראלי"
                        className="coachee-input"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'paypal' && (
                  <div className="text-center py-8">
                    <div className="bg-gradient-to-r from-glacier-info/10 to-glacier-info/5 border border-glacier-info/30 rounded-2xl p-6">
                      <DollarSign className="w-12 h-12 text-glacier-info-dark mx-auto mb-4" />
                      <h5 className="font-bold text-neutral-800 mb-2">תשלום דרך PayPal</h5>
                      <p className="text-neutral-600 text-sm">תועברו לאתר PayPal להשלמת התשלום</p>
                  </div>
                </div>
              )}

                {paymentMethod === 'bank' && (
                  <div className="text-center py-8">
                    <div className="bg-gradient-to-r from-glacier-accent/10 to-glacier-accent/5 border border-glacier-accent/30 rounded-2xl p-6">
                      <Shield className="w-12 h-12 text-glacier-accent-dark mx-auto mb-4" />
                      <h5 className="font-bold text-neutral-800 mb-2">העברה בנקאית</h5>
                      <p className="text-neutral-600 text-sm mb-4">פרטי ההעברה יישלחו אליכם במייל</p>
                      <div className="text-xs text-neutral-500 bg-neutral-50 rounded-xl p-3">
                        תקופת אישור: 1-3 ימי עסקים
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep('package')}
                  className="coachee-btn-secondary flex-1"
                >
                  חזרה
                </button>
                <button
                  onClick={handlePayment}
                  className="coachee-btn-primary flex-2 text-lg"
                >
                  <CreditCard className="w-5 h-5" />
                  בצע תשלום ${calculateFinalPrice()}
                </button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {currentStep === 'processing' && (
            <div className="text-center py-16 animate-in fade-in duration-500">
              <div className="mb-8">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-glacier-primary to-glacier-secondary rounded-full animate-pulse"></div>
                  <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                    <CreditCard className="w-8 h-8 text-glacier-primary animate-bounce" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-neutral-800 mb-3">מעבד תשלום...</h3>
                <p className="text-neutral-600 mb-6">אנא המתינו, התשלום בביצוע</p>
                
                <div className="max-w-xs mx-auto">
                  <div className="bg-neutral-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-glacier-primary to-glacier-secondary h-full rounded-full animate-pulse" style={{width: '75%'}}></div>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-neutral-500">
                <Clock className="w-4 h-4 inline mr-2" />
                זמן עיבוד משוער: 30 שניות
              </div>
            </div>
          )}

          {/* Success Step */}
          {currentStep === 'success' && (
            <div className="text-center py-16 animate-in slide-in-from-bottom duration-500">
              <div className="mb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-glacier-success to-glacier-success-dark rounded-full flex items-center justify-center mx-auto mb-6 shadow-glacier-soft">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                
                <h3 className="text-3xl font-bold text-neutral-800 mb-4">תשלום בוצע בהצלחה!</h3>
                <p className="text-neutral-600 mb-8 leading-relaxed">
                  החבילה שלכם פעילה והמערכת מוכנה לשימוש.<br />
                  קבלה תישלח אליכם במייל תוך מספר דקות.
                </p>
                
                <div className="coachee-card p-6 mb-8 max-w-md mx-auto">
                  <h4 className="font-bold text-neutral-800 mb-4">פרטי הרכישה</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">חבילה:</span>
                      <span className="font-semibold">{pkg.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">סכום:</span>
                      <span className="font-semibold text-glacier-success-dark">${calculateFinalPrice()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">תאריך:</span>
                      <span className="font-semibold">{new Date().toLocaleDateString('he-IL')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => {
                    onSuccess({
                      package_id: pkg.id,
                      package_name: pkg.name,
                      users_count: pkg.users_count,
                      final_price: calculateFinalPrice(),
                      payment_method: paymentMethod
                    })
                  }}
                  className="coachee-btn-primary text-lg px-8 py-4"
                >
                  <Zap className="w-5 h-5" />
                  התחל להשתמש במערכת
                </button>
                
                <p className="text-sm text-neutral-500">
                  החלון יסגר אוטומטית בעוד {countdown} שניות...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 