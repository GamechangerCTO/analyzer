'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ChangePasswordPage() {
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  
  const supabase = createClient()
  const router = useRouter()

  // בדיקה שהמשתמש מחובר ויש לו חובת החלפת סיסמה
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      
      // בדיקה אם יש חובת החלפת סיסמה
      const forcePasswordChange = user.user_metadata?.force_password_change
      if (!forcePasswordChange) {
        // אם אין חובת החלפת סיסמה, הפניה לדשבורד
        router.push('/dashboard')
      }
    }
    
    checkUser()
  }, [router, supabase])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswords(prev => ({ ...prev, [name]: value }))
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      // Validation
      if (!passwords.newPassword || passwords.newPassword.length < 6) {
        setMessage({ type: 'error', text: 'הסיסמה החדשה חייבת להכיל לפחות 6 תווים' })
        setIsSubmitting(false)
        return
      }

      if (passwords.newPassword !== passwords.confirmPassword) {
        setMessage({ type: 'error', text: 'הסיסמאות אינן תואמות' })
        setIsSubmitting(false)
        return
      }

      // עדכון הסיסמה
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwords.newPassword
      })

      if (updateError) {
        throw updateError
      }

      // עדכון ה-metadata כדי להסיר את חובת החלפת הסיסמה
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          force_password_change: false,
          password_changed_at: new Date().toISOString()
        }
      })

      if (metadataError) {
        console.warn('Warning updating metadata:', metadataError)
      }

      setMessage({ 
        type: 'success', 
        text: 'הסיסמה שונתה בהצלחה! מעביר אותך לדשבורד...' 
      })

      // הפניה לדשבורד אחרי 2 שניות
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error: any) {
      console.error('Error changing password:', error)
      setMessage({ 
        type: 'error', 
        text: error.message || 'שגיאה בשינוי הסיסמה' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-glacier-neutral-200/50 p-8">
          
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-glacier-warning rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">החלפת סיסמה נדרשת</h2>
            <p className="text-glacier-neutral-600">
              זוהי הכניסה הראשונה שלך למערכת. אנא החלף את הסיסמה הזמנית שקיבלת.
            </p>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mb-6 p-4 rounded-2xl animate-in slide-in-from-top duration-500 ${
              message.type === 'success' 
                ? 'bg-gradient-to-r from-glacier-success-50 to-green-100 border border-glacier-success-200'
                : 'bg-gradient-to-r from-red-50 to-red-100 border border-red-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  message.type === 'success' ? 'bg-glacier-success' : 'bg-red-500'
                }`}>
                  {message.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-white" />
                  )}
                </div>
                <p className={`font-medium ${
                  message.type === 'success' ? 'text-glacier-success-700' : 'text-red-700'
                }`}>
                  {message.text}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* New Password Field */}
            <div className="space-y-3">
              <label htmlFor="newPassword" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                <Lock className="w-5 h-5 text-glacier-primary" />
                סיסמה חדשה
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  id="newPassword"
                  name="newPassword"
                  value={passwords.newPassword}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu pr-12"
                  placeholder="הכנס סיסמה חדשה (לפחות 6 תווים)..."
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-glacier-neutral-400 hover:text-glacier-neutral-600"
                >
                  {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-3">
              <label htmlFor="confirmPassword" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                <Lock className="w-5 h-5 text-glacier-accent" />
                אישור סיסמה
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwords.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu pr-12"
                  placeholder="הכנס שוב את הסיסמה החדשה..."
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-glacier-neutral-400 hover:text-glacier-neutral-600"
                >
                  {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative px-8 py-4 bg-gradient-to-r from-glacier-primary to-glacier-primary-dark text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transform-gpu shadow-lg hover:shadow-xl disabled:hover:scale-100 min-w-[200px]"
              >
                <div className="flex items-center justify-center gap-3">
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>משנה סיסמה...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                      <span>שינוי סיסמה</span>
                    </>
                  )}
                </div>
                
                {/* Hover effect */}
                <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>

            {/* Info Box */}
            <div className="mt-8 p-6 bg-gradient-to-r from-glacier-warning-50 to-yellow-50 border border-glacier-warning-200 rounded-2xl">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-glacier-warning rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">חשוב לדעת</h3>
                  <div className="space-y-2 text-sm text-neutral-700">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-glacier-warning rounded-full mt-2 flex-shrink-0"></div>
                      <span>הסיסמה החדשה חייבת להכיל לפחות 6 תווים</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-glacier-warning rounded-full mt-2 flex-shrink-0"></div>
                      <span>בחר סיסמה חזקה שקשה לניחוש</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-glacier-warning rounded-full mt-2 flex-shrink-0"></div>
                      <span>לאחר שינוי הסיסמה תועבר לדשבורד הראשי</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}