'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, MessageSquare, AlertCircle, CheckCircle2, Send, Lock } from 'lucide-react'

interface AddAgentFormProps {
  companyId: string
  requesterId: string
}

export default function AddAgentForm({ companyId, requesterId }: AddAgentFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  const supabase = createClient()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // מניעת שליחות מרובות
    if (isSubmitting) {
      return
    }
    
    setIsSubmitting(true)
    setMessage(null)

    try {
      // Basic validation
      if (!formData.email.trim()) {
        setMessage({ type: 'error', text: 'כתובת אימייל היא שדה חובה' })
        setIsSubmitting(false)
        return
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        setMessage({ type: 'error', text: 'כתובת אימייל אינה תקינה' })
        setIsSubmitting(false)
        return
      }

      // Password validation
      if (!formData.password || formData.password.length < 6) {
        setMessage({ type: 'error', text: 'סיסמה חייבת להכיל לפחות 6 תווים' })
        setIsSubmitting(false)
        return
      }

      // Full name validation
      if (!formData.full_name.trim()) {
        setMessage({ type: 'error', text: 'שם מלא הוא שדה חובה' })
        setIsSubmitting(false)
        return
      }

      // Call API to create agent request
      const response = await fetch('/api/team/add-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          full_name: formData.full_name.trim(),
          notes: formData.notes.trim(),
          companyId,
          requesterId
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'שגיאה בשליחת הבקשה')
      }

      setMessage({ 
        type: 'success', 
        text: result.message || 'נציג נוסף בהצלחה למערכת!'
      })

      // Reset form
      setFormData({
        email: '',
        password: '',
        full_name: '',
        notes: ''
      })

    } catch (error) {
      console.error('Error submitting agent request:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'שגיאה לא ידועה בשליחת הבקשה'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-glacier-neutral-200/50 p-8 md:p-12">
      
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-glacier-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">הוספת נציג חדש</h2>
        <p className="text-glacier-neutral-600">
          הוסף נציג חדש לצוות. הנציג יקבל פרטי התחברות ויידרש להחליף סיסמה בכניסה הראשונה.
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

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Email Field */}
        <div className="space-y-3">
          <label htmlFor="email" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <Mail className="w-5 h-5 text-glacier-primary" />
            כתובת אימייל 
            <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
            placeholder="הכנס כתובת אימייל של הנציג החדש..."
          />
        </div>

        {/* Password Field */}
        <div className="space-y-3">
          <label htmlFor="password" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <Lock className="w-5 h-5 text-glacier-accent" />
            סיסמה
            <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
            placeholder="הכנס סיסמה זמנית (לפחות 6 תווים)..."
          />
          <p className="mt-2 text-sm text-glacier-neutral-600 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-glacier-warning mt-0.5 flex-shrink-0" />
            הנציג יתבקש להחליף את הסיסמה בכניסה הראשונה למערכת
          </p>
        </div>

        {/* Full Name Field */}
        <div className="space-y-3">
          <label htmlFor="full_name" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <User className="w-5 h-5 text-glacier-secondary" />
            שם מלא
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
            className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
            placeholder="הכנס שם מלא של הנציג..."
          />
        </div>
        
        {/* Notes Field */}
        <div className="space-y-3">
          <label htmlFor="notes" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-glacier-accent" />
            הערות נוספות
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu resize-none"
            placeholder="הוסף הערות נוספות או פרטים על הנציג החדש (אופציונלי)..."
          />
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
                  <span>יוצר נציג...</span>
                </>
              ) : (
                <>
                  <User className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                  <span>הוסף נציג</span>
                </>
              )}
            </div>
            
            {/* Hover effect */}
            <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-gradient-to-r from-glacier-accent-50 to-glacier-secondary-50 border border-glacier-accent-200 rounded-2xl">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-glacier-accent rounded-xl flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-neutral-900 mb-2">תהליך הוספת נציג</h3>
              <div className="space-y-2 text-sm text-neutral-700">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-glacier-accent rounded-full mt-2 flex-shrink-0"></div>
                  <span>הנציג נוצר מיידית במערכת עם הפרטים שהוזנו</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-glacier-accent rounded-full mt-2 flex-shrink-0"></div>
                  <span>הנציג יכול להתחבר מיד עם האימייל והסיסמה שהוגדרו</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-glacier-accent rounded-full mt-2 flex-shrink-0"></div>
                  <span>בכניסה הראשונה, הנציג יתבקש להחליף את הסיסמה</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>ניתן להוסיף נציגים ללא הגבלה - המגבלה רק על דקות השימוש</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}