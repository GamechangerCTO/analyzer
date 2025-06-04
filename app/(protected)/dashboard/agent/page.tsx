'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import AgentDashboardContent from './AgentDashboardContent'

export default function AgentDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetUserId = searchParams.get('user')
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [targetUserInfo, setTargetUserInfo] = useState<{full_name: string | null, email: string} | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (!isMounted) return;
        
        if (!user || userError) {
          router.push('/login')
          return
        }

        if (!user.email) {
          setError("לא נמצא כתובת אימייל למשתמש")
          setLoading(false)
          return
        }

        const isAdmin = user.email === 'ido.segev23@gmail.com'
        
        let { data: userData, error: emailCheckError } = await supabase
          .from('users')
          .select('role, is_approved, company_id')
          .eq('email', user.email!)
          .maybeSingle()
        
        if (!isMounted) return;
          
        if (emailCheckError || !userData) {
          const { data: userDataById, error: userByIdError } = await supabase
            .from('users')
            .select('role, is_approved, company_id')
            .eq('id', user.id)
            .maybeSingle()
          
          if (!isMounted) return;
            
          if (userByIdError || !userDataById) {
            setError("לא נמצאו פרטי משתמש במערכת. אנא פנה למנהל המערכת.")
            setLoading(false)
            return
          }
          
          if (!userDataById.is_approved) {
            router.push('/not-approved?reason=pending')
            return
          }
          
          userData = userDataById
        } else if (!userData.is_approved) {
          router.push('/not-approved?reason=pending')
          return
        }

        if (targetUserId) {
          if (!isAdmin && userData.role !== 'manager') {
            router.push('/dashboard')
            return
          }

          const { data: targetUser, error: targetError } = await supabase
            .from('users')
            .select('id, full_name, email, role, company_id')
            .eq('id', targetUserId)
            .single()

          if (!isMounted) return;

          if (targetError || !targetUser) {
            setError("הנציג המבוקש לא נמצא במערכת.")
            setLoading(false)
            return
          }

          if (!isAdmin && userData.company_id !== targetUser.company_id) {
            setError("אין לך הרשאה לצפות בנציג זה.")
            setLoading(false)
            return
          }

          if (targetUser.role !== 'agent') {
            setError("המשתמש המבוקש אינו נציג.")
            setLoading(false)
            return
          }

          setTargetUserInfo({ full_name: targetUser.full_name, email: targetUser.email || '' })
          setUserId(targetUserId)
          setCompanyId(targetUser.company_id)
          setIsAuthorized(true)
          setLoading(false)
          return
        }

        if (isAdmin) {
          setIsAuthorized(true)
          setUserId(user.id)
          setCompanyId(userData.company_id)
          setLoading(false)
          return
        }
        
        if (userData.role !== 'agent' && userData.role !== 'admin') {
          router.push('/dashboard/manager')
          return
        }
        
        setIsAuthorized(true)
        setUserId(user.id)
        setCompanyId(userData.company_id)
        setLoading(false)
      } catch (err) {
        if (!isMounted) return;
        setError(`שגיאה לא צפויה: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
      }
    }
    
    checkAuth()
    
    return () => {
      isMounted = false;
    }
  }, [router, supabase, targetUserId])

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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
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

  if (!isAuthorized) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">אין הרשאה</h2>
          <p className="text-gray-700">אין לך הרשאה לצפות בדף זה.</p>
        </div>
      </div>
    )
  }

  return (
    <AgentDashboardContent 
      userId={userId!} 
      companyId={companyId} 
      targetUserInfo={targetUserInfo}
    />
  )
} 