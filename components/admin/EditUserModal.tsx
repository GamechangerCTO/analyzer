'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, User, Building2, AlertCircle, CheckCircle2, Save, Mail, Shield } from 'lucide-react'

interface User {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
  company_id: string | null
  is_approved: boolean
}

interface Company {
  id: string
  name: string
}

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  userToEdit: User | null
  onUserUpdated: () => void
}

export default function EditUserModal({ isOpen, onClose, userToEdit, onUserUpdated }: EditUserModalProps) {
  const supabase = createClient()
  const [formData, setFormData] = useState<{ full_name: string; company_id: string }>({ full_name: '', company_id: '' })
  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCompanies() {
      if (!isOpen) return
      setLoadingCompanies(true)
      setError(null)
      try {
        const { data, error } = await supabase.from('companies').select('id, name')
        if (error) throw error
        setCompanies(data || [])
      } catch (e) {
        console.error("Failed to fetch companies:", e)
        setError("שגיאה בטעינת רשימת החברות.")
      } finally {
        setLoadingCompanies(false)
      }
    }
    fetchCompanies()
  }, [isOpen, supabase])

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        full_name: userToEdit.full_name || '',
        company_id: userToEdit.company_id || ''
      })
    } else {
      setFormData({ full_name: '', company_id: '' })
    }
    setError(null)
    setSuccessMessage(null)
  }, [userToEdit])

  if (!isOpen || !userToEdit) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userToEdit) return
    setSaving(true)
    setError(null)
    setSuccessMessage(null)
    
    try {
      // ולידציה: אדמינים לא צריכים להיות משויכים לחברה
      if (userToEdit.role === 'admin' && formData.company_id) {
        setError('מנהלי מערכת לא צריכים להיות משויכים לחברה ספציפית.')
        setSaving(false)
        return
      }

      // ולידציה: מנהלים ונציגים חייבים להיות משויכים לחברה
      if ((userToEdit.role === 'manager' || userToEdit.role === 'agent') && !formData.company_id) {
        const roleText = userToEdit.role === 'manager' ? 'מנהלים' : 'נציגים'
        setError(`${roleText} חייבים להיות משויכים לחברה. אנא בחר חברה.`)
        setSaving(false)
        return
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          company_id: formData.company_id || null,
        })
        .eq('id', userToEdit.id)

      if (updateError) {
        throw updateError
      }

      setSuccessMessage('המשתמש עודכן בהצלחה!')
      onUserUpdated()

      // Close modal after delay
      setTimeout(() => {
        onClose()
      }, 2000)

    } catch (error: any) {
      console.error("Error updating user:", error)
      setError('שגיאה בעדכון המשתמש: ' + (error.message || 'שגיאה לא ידועה'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-glacier-neutral-200/50 w-full max-w-md max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-glacier-primary to-glacier-primary-dark p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">עריכת משתמש</h2>
                <p className="text-glacier-primary-100 text-sm">{userToEdit.email}</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors duration-200"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6">
          
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

          {/* User Info Display */}
          <div className="mb-6 p-4 bg-glacier-neutral-50 rounded-xl border border-glacier-neutral-200">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-glacier-neutral-500" />
                <span className="text-sm text-glacier-neutral-600">אימייל:</span>
                <span className="font-medium text-neutral-900">{userToEdit.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-glacier-neutral-500" />
                <span className="text-sm text-glacier-neutral-600">תפקיד:</span>
                <span className="font-medium text-neutral-900">
                  {userToEdit.role === 'admin' ? 'מנהל מערכת' :
                   userToEdit.role === 'manager' ? 'מנהל' : 'נציג'}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Full Name */}
            <div className="space-y-3">
              <label htmlFor="full_name_edit" className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <User className="w-5 h-5 text-glacier-primary" />
                שם מלא
              </label>
              <input
                type="text"
                id="full_name_edit"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
                placeholder="הכנס שם מלא..."
              />
            </div>

            {/* Company - Only for non-admin roles */}
            {userToEdit.role !== 'admin' && (
              <div className="space-y-3">
                <label htmlFor="company_id_edit" className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-glacier-accent" />
                  חברה
                  <span className="text-red-500">*</span>
                </label>
                {loadingCompanies ? (
                  <div className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl bg-glacier-neutral-50 flex items-center justify-center">
                    <span className="text-glacier-neutral-500">טוען חברות...</span>
                  </div>
                ) : (
                  <select
                    id="company_id_edit"
                    name="company_id"
                    value={formData.company_id}
                    onChange={handleChange}
                    required={userToEdit.role !== 'admin'}
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

            {/* Admin Note */}
            {userToEdit.role === 'admin' && (
              <div className="p-4 bg-gradient-to-r from-glacier-info-50 to-blue-50 border border-glacier-info-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-glacier-info mt-0.5" />
                  <div>
                    <p className="text-glacier-info-700 font-medium text-sm">הערה למנהלי מערכת</p>
                    <p className="text-glacier-info-600 text-xs mt-1">מנהלי מערכת אינם משויכים לחברה ספציפית ויש להם גישה לכל המערכת.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Required Company Note */}
            {(userToEdit.role === 'manager' || userToEdit.role === 'agent') && (
              <div className="p-4 bg-gradient-to-r from-glacier-warning-50 to-yellow-50 border border-glacier-warning-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-glacier-warning mt-0.5" />
                  <div>
                    <p className="text-glacier-warning-700 font-medium text-sm">חובת שיוך לחברה</p>
                    <p className="text-glacier-warning-600 text-xs mt-1">
                      {userToEdit.role === 'manager' ? 'מנהלים' : 'נציגים'} חייבים להיות משויכים לחברה כדי לגשת למערכת.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
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
                disabled={saving || loadingCompanies}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-glacier-success to-glacier-success-dark text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transform-gpu shadow-lg hover:shadow-xl disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>שומר...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>שמור שינויים</span>
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