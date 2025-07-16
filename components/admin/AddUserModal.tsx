'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, User, Mail, Lock, Building2, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Company {
  id: string
  name: string
}

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserAdded: () => void
}

export default function AddUserModal({ isOpen, onClose, onUserAdded }: AddUserModalProps) {
  const supabase = createClient()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'agent',
    company_id: ''
  })
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    async function fetchCompanies() {
      if (!isOpen) return
      
      setLoadingCompanies(true)
      setError(null)
      
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id, name')
          .order('name')

        if (error) throw error
        setCompanies(data || [])
      } catch (e) {
        console.error("Failed to fetch companies:", e)
        setError("שגיאה בטעינת רשימת החברות.")
      } finally {
        setLoadingCompanies(false)
      }
    }

    if (isOpen) {
      fetchCompanies()
      // Reset form when opening
      setFormData({
        email: '',
        password: '',
        full_name: '',
        role: 'agent',
        company_id: ''
      })
      setError(null)
      setSuccessMessage(null)
      setCreating(false)
    }
  }, [isOpen, supabase])

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setSuccessMessage(null)
    
    try {
      // Validation
      if (!formData.email.trim()) {
        setError('אימייל הוא שדה חובה.')
        setCreating(false)
        return
      }

      if (!formData.password || formData.password.length < 6) {
        setError('סיסמה חייבת להכיל לפחות 6 תווים.')
        setCreating(false)
        return
      }

      if (!formData.full_name.trim()) {
        setError('שם מלא הוא שדה חובה.')
        setCreating(false)
        return
      }

      // Admins don't need a company
      if (formData.role !== 'admin' && !formData.company_id) {
        setError('יש לבחור חברה עבור נציגים ומנהלים.')
        setCreating(false)
        return
      }

      // Admins shouldn't have a company
      if (formData.role === 'admin' && formData.company_id) {
        setError('מנהלי מערכת לא צריכים להיות משויכים לחברה ספציפית.')
        setCreating(false)
        return
      }

      const response = await fetch('/api/admin/create-user-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          full_name: formData.full_name.trim(),
          role: formData.role,
          company_id: formData.role === 'admin' ? null : formData.company_id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'שגיאה ביצירת המשתמש')
      }

      setSuccessMessage('משתמש נוצר בהצלחה!')
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        full_name: '',
        role: 'agent',
        company_id: ''
      })

      // Notify parent component
      onUserAdded()

      // Close modal after delay
      setTimeout(() => {
        onClose()
      }, 2000)

    } catch (err) {
      console.error('Error creating user:', err)
      setError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-glacier-neutral-200/50 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-glacier-neutral-200">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
            <User className="w-6 h-6 text-glacier-primary" />
            הוספת משתמש חדש
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-glacier-neutral-100 rounded-xl transition-colors duration-200"
          >
            <X className="w-5 h-5 text-neutral-600" />
          </button>
        </div>
        
        <div className="p-6">
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

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email */}
            <div className="space-y-3">
              <label htmlFor="email_add" className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-glacier-primary" />
                אימייל
                <span className="text-red-500">*</span>
              </label>
              <input 
                type="email" 
                name="email" 
                id="email_add" 
                value={formData.email} 
                onChange={handleChange} 
                required 
                className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
                placeholder="הכנס כתובת אימייל..."
              />
            </div>
            
            {/* Password */}
            <div className="space-y-3">
              <label htmlFor="password_add" className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-glacier-accent" />
                סיסמה
                <span className="text-red-500">*</span>
              </label>
              <input 
                type="password" 
                name="password" 
                id="password_add" 
                value={formData.password} 
                onChange={handleChange} 
                required 
                minLength={6} 
                className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
                placeholder="הכנס סיסמה (לפחות 6 תווים)..."
              />
            </div>
            
            {/* Full Name */}
            <div className="space-y-3">
              <label htmlFor="full_name_add" className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <User className="w-5 h-5 text-glacier-secondary" />
                שם מלא
                <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                name="full_name" 
                id="full_name_add" 
                value={formData.full_name} 
                onChange={handleChange} 
                required 
                className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
                placeholder="הכנס שם מלא..."
              />
            </div>
            
            {/* Role */}
            <div className="space-y-3">
              <label htmlFor="role_add" className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-glacier-warning" />
                תפקיד
                <span className="text-red-500">*</span>
              </label>
              <select 
                name="role" 
                id="role_add" 
                value={formData.role} 
                onChange={handleChange} 
                required 
                className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
              >
                <option value="agent">נציג</option>
                <option value="manager">מנהל</option>
                <option value="admin">אדמין</option>
              </select>
            </div>
            
            {/* Company - Only for non-admin roles */}
            {formData.role !== 'admin' && (
              <div className="space-y-3">
                <label htmlFor="company_id_add" className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-glacier-info" />
                  חברה
                  <span className="text-red-500">*</span>
                </label>
                {loadingCompanies ? (
                  <div className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl bg-glacier-neutral-50 flex items-center justify-center">
                    <span className="text-glacier-neutral-500">טוען חברות...</span>
                  </div>
                ) : (
                  <select 
                    name="company_id" 
                    id="company_id_add" 
                    value={formData.company_id} 
                    onChange={handleChange} 
                    required={formData.role !== 'admin'}
                    className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
                  >
                    <option value="">בחר חברה...</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
            
            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-glacier-neutral-200 hover:bg-glacier-neutral-300 text-glacier-neutral-700 font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] transform-gpu"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={creating || loadingCompanies}
                className="flex-1 px-6 py-4 bg-glacier-primary hover:bg-glacier-primary-dark text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transform-gpu disabled:hover:scale-100"
              >
                {creating ? 'יוצר משתמש...' : 'צור משתמש'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 