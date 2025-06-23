'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ManagerDashboardContent from './ManagerDashboardContent'

export default function ManagerDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (!user || userError) {
          router.push('/login')
          return
        }

        // קבלת פרטי המשתמש מבסיס הנתונים
        const { data: userData, error: dbError } = await supabase
          .from('users')
          .select('id, role, company_id, is_approved, email')
          .eq('id', user.id)
          .single()

        if (dbError || !userData) {
          setError("לא נמצאו פרטי משתמש במערכת")
          setLoading(false)
          return
        }

        // בדיקת אישור
        if (!userData.is_approved) {
          router.push('/not-approved?reason=pending')
          return
        }

        // בדיקת הרשאות - מאפשר רק למנהל
        if (userData.role !== 'manager' && userData.role !== 'admin') {
          router.push('/dashboard/agent')
          return
        }

        // וידוא שיש company_id
        if (!userData.company_id) {
          setError("משתמש לא משויך לחברה")
          setLoading(false)
          return
        }

        setIsAuthorized(true)
        setUserId(user.id)
        setCompanyId(userData.company_id)
        setLoading(false)

      } catch (err) {
        setError(`שגיאה לא צפויה: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-2xl font-bold text-red-600 mb-4">שגיאה</h2>
          <p className="text-gray-700">{error}</p>
          <div className="mt-6">
            <button 
              onClick={() => router.push('/login')}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
            >
              חזרה לדף התחברות
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthorized || !userId || !companyId) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-2xl font-bold text-red-600 mb-4">אין הרשאה</h2>
          <p className="text-gray-700">אין לך הרשאה לצפות בדף זה.</p>
        </div>
      </div>
    )
  }

  return <ManagerDashboardContent userId={userId} companyId={companyId} />
} 