'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  X, 
  Building2, 
  AlertCircle, 
  CheckCircle2,
  Info
} from 'lucide-react'

interface Company {
  id: string
  name: string
}

interface AddCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  onCompanyAdded: () => void
}

export default function AddCompanyModal({ isOpen, onClose, onCompanyAdded }: AddCompanyModalProps) {
  const supabase = createClient()
  const [formData, setFormData] = useState({
    name: '',
    is_poc: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    // Reset form when modal is opened/closed or on error/success
    if (isOpen) {
        setFormData({
            name: '',
            is_poc: false,
        })
        setError(null)
        setSuccessMessage(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({
        ...prev,
        [name]: checked,
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // בדיקת שדות חובה
      if (!formData.name.trim()) {
        setError('שם החברה הוא שדה חובה.')
        setSaving(false)
        return
      }

      // יצירת החברה - רק עם השדות הבסיסיים
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: formData.name.trim(),
          is_poc: formData.is_poc,
        })
        .select()

      if (companyError) {
        throw new Error(`שגיאה ביצירת החברה: ${companyError.message}`)
      }

      console.log('Company created successfully:', companyData[0])

      // יצירת מכסת דקות לחברה החדשה
      if (companyData && companyData.length > 0) {
        const newCompanyId = companyData[0].id
        const quotaMinutes = formData.is_poc ? 240 : 720 // POC = 240 דק', רגיל = 720 דק'
        
        console.log('Creating minutes quota for company:', { 
          companyId: newCompanyId, 
          isPoc: formData.is_poc, 
          minutes: quotaMinutes 
        })

        const { error: quotaError } = await supabase
          .from('company_minutes_quotas')
          .insert({
            company_id: newCompanyId,
            total_minutes: quotaMinutes,
            used_minutes: 0,
            is_poc: formData.is_poc,
          })

        if (quotaError) {
          console.error('Warning: Failed to create minutes quota:', quotaError)
          // לא נכשיל את כל התהליך בגלל זה, אבל נתרה
          setError(`החברה נוצרה אבל היתה בעיה ביצירת מכסת הדקות: ${quotaError.message}`)
        } else {
          console.log('Minutes quota created successfully')
        }

        // מגבלת משתמשים הוסרה - רק מגבלת דקות רלוונטית
      }

      setSuccessMessage('החברה נוצרה בהצלחה! המנהל יוכל להשלים את השאלון בכניסה הראשונה.')

      // קריאה לפונקציה של הקומפוננט האב לרענון הרשימה
      onCompanyAdded()

      // סגירת המודל אחרי רגע
      setTimeout(() => {
        onClose()
      }, 2000)

    } catch (err) {
      console.error('Error creating company:', err)
      setError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-glacier-neutral-200/50 w-full max-w-md max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-glacier-primary to-glacier-primary-dark p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">הוספת חברה חדשה</h2>
                <p className="text-glacier-primary-100">יצירת חברה במערכת - המנהל ישלים את השאלון</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-3 hover:bg-white/20 rounded-xl transition-colors duration-200"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          
          {/* Info Box */}
          <div className="mb-8 p-6 bg-gradient-to-r from-glacier-accent-50 to-glacier-secondary-50 border border-glacier-accent-200 rounded-2xl">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-glacier-accent rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-neutral-900 mb-2">תהליך יצירת חברה מפושט</h3>
                <p className="text-neutral-700 text-sm">כאדמין, תזין רק את שם החברה וסטטוס POC. המנהל ישלים את השאלון המלא בכניסה הראשונה למערכת.</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}
          
          {successMessage && (
            <div className="mb-6 p-4 bg-gradient-to-r from-glacier-success-50 to-green-100 border border-glacier-success-200 rounded-2xl animate-in slide-in-from-top duration-500">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-glacier-success rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <p className="text-glacier-success-700 font-bold">{successMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* שם החברה */}
            <div className="space-y-3">
              <label htmlFor="name_add" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-glacier-primary" />
                שם החברה 
                <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                name="name" 
                id="name_add" 
                value={formData.name} 
                onChange={handleChange} 
                required 
                className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
                placeholder="הזן שם החברה..."
              />
            </div>
            
            {/* סימון POC */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="is_poc"
                  id="is_poc_add"
                  checked={formData.is_poc}
                  onChange={handleChange}
                  className="w-5 h-5 text-glacier-primary border-2 border-glacier-neutral-300 rounded focus:ring-glacier-primary focus:ring-2"
                />
                <label htmlFor="is_poc_add" className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-glacier-secondary" />
                  זוהי חברת POC (Proof of Concept)
                </label>
              </div>
              <p className="text-sm text-gray-600 mr-8">
                חברות POC מקבלות הגדרות מיוחדות ומכסות נמוכות יותר לצורכי בדיקה
              </p>
            </div>

            <div className="flex gap-4 pt-6 border-t border-glacier-neutral-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-glacier-neutral-200 hover:bg-glacier-neutral-300 text-glacier-neutral-700 font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] transform-gpu"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-glacier-primary to-glacier-primary-dark text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transform-gpu shadow-lg hover:shadow-xl disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>יוצר חברה...</span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-5 h-5" />
                    <span>יצירת חברה</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 