'use client'

// Force dynamic rendering for this page due to useSearchParams
export const dynamic = 'force-dynamic'

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
      <div className="flex justify-center items-center min-h-screen bg-cream-sand-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lemon-mint mx-auto mb-4"></div>
          <div className="w-16 h-16 bg-lemon-mint/20 rounded-full flex items-center justify-center mb-4 animate-lemon-pulse">
            <svg className="w-8 h-8 text-lemon-mint-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <p className="text-indigo-night font-medium text-display">טוען את חדר הכושר שלך...</p>
          <p className="text-indigo-night/60 text-sm mt-1">מכין את הניתוחים האחרונים</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-sand-light">
        <div className="max-w-md w-full replayme-card p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-electric-coral/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-coral-pulse">
              <svg className="w-8 h-8 text-electric-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-electric-coral mb-2 text-display">שגיאה בטעינה</h2>
            <p className="text-indigo-night/70">{error}</p>
          </div>
          <button 
            onClick={() => router.push('/login')}
            className="w-full replayme-button-primary"
          >
            חזרה לדף התחברות
          </button>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-cream-sand-light">
        <div className="max-w-md w-full replayme-card p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-indigo-night mb-2 text-display">אין הרשאה</h2>
            <p className="text-indigo-night/70">אין לך הרשאה לצפות בדף זה.</p>
          </div>
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