'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AddAgentFormProps {
  companyId: string
  requesterId: string
}

export default function AddAgentForm({ companyId, requesterId }: AddAgentFormProps) {
  const supabase = createClient()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    notes: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    try {
      // בדיקת תקינות
      if (!formData.fullName || !formData.email) {
        throw new Error('יש למלא את כל השדות הנדרשים')
      }
      
      // הוספת הבקשה לטבלת בקשות
      const { data, error: insertError } = await supabase
        .from('agent_approval_requests')
        .insert({
          company_id: companyId,
          requested_by: requesterId,
          full_name: formData.fullName,
          email: formData.email,
          status: 'pending',
        })
        .select()
      
      if (insertError) {
        throw new Error('אירעה שגיאה בשליחת הבקשה: ' + insertError.message)
      }
      
      setSuccess(true)
      setFormData({
        fullName: '',
        email: '',
        notes: '',
      })
      
      // רענון הדף אחרי שניה
      setTimeout(() => {
        router.refresh()
      }, 1000)
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (success) {
    return (
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <h3 className="text-xl font-semibold text-green-800 mb-2">הבקשה נשלחה בהצלחה!</h3>
        <p className="text-green-700 mb-4">
          בקשתך להוספת נציג נשלחה למנהל המערכת לאישור. תקבל עדכון כאשר הבקשה תאושר.
        </p>
        <button
          onClick={() => router.push('/team')}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          חזרה לניהול צוות
        </button>
      </div>
    )
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-200">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
          שם מלא <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          required
        />
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          כתובת אימייל <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          required
        />
        <p className="mt-1 text-sm text-gray-500">
          לאחר אישור הבקשה, הנציג יקבל הודעת אימייל עם קישור להרשמה
        </p>
      </div>
      
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          הערות
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
        />
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          {isSubmitting ? 'שולח בקשה...' : 'שליחת בקשה'}
        </button>
      </div>
    </form>
  )
}