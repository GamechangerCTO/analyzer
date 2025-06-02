'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import AgentDashboardClient from './AgentDashboardClient'

export default function AgentDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetUserId = searchParams.get('user') // המשתמש שאותו רוצים לצפות
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
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

        // בדיקה שיש אימייל למשתמש
        if (!user.email) {
          setError("לא נמצא כתובת אימייל למשתמש")
          setLoading(false)
          return
        }

        // בדיקה האם זה מנהל המערכת
        const isAdmin = user.email === 'ido.segev23@gmail.com'
        
        // בדיקת משתמש לפי אימייל
        let { data: userData, error: emailCheckError } = await supabase
          .from('users')
          .select('role, is_approved, company_id')
          .eq('email', user.email!)
          .maybeSingle()
        
        if (!isMounted) return;
          
        // אם לא נמצא לפי אימייל, בדיקה לפי מזהה
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
          
          // הגדרת userData למשתמש שנמצא לפי ID
          userData = userDataById
        } else if (!userData.is_approved) {
          router.push('/not-approved?reason=pending')
          return
        }

        // אם יש targetUserId - מישהו רוצה לצפות בנציג אחר
        if (targetUserId) {
          // רק מנהל מערכת או מנהל יכול לצפות בנציגים אחרים
          if (!isAdmin && userData.role !== 'manager') {
            router.push('/dashboard')
            return
          }

          // קבלת פרטי הנציג המבוקש
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

          // בדיקה שהמנהל יכול לצפות בנציג הזה (אותה חברה)
          if (!isAdmin && userData.company_id !== targetUser.company_id) {
            setError("אין לך הרשאה לצפות בנציג זה.")
            setLoading(false)
            return
          }

          // בדיקה שהמשתמש המבוקש הוא נציג
          if (targetUser.role !== 'agent') {
            setError("המשתמש המבוקש אינו נציג.")
            setLoading(false)
            return
          }

          setTargetUserInfo({ full_name: targetUser.full_name, email: targetUser.email || '' })
          setUserId(targetUserId) // נציג את הנציג המבוקש
          setIsAuthorized(true)
          setLoading(false)
          return
        }

        // אם אין targetUserId - צפייה רגילה בנציג המחובר
        if (isAdmin) {
          // מנהל מערכת תמיד רשאי לצפות כנציג (בעצמו)
          setIsAuthorized(true)
          setUserId(user.id)
          setLoading(false)
          return
        }
        
        // בדיקה האם הוא נציג או בעל תפקיד גבוה יותר
        if (userData.role !== 'agent' && userData.role !== 'admin') {
          router.push('/dashboard/manager')
          return
        }
        
        // אישור גישה לנציג אמיתי
        setIsAuthorized(true)
        setUserId(user.id)
        setLoading(false)
      } catch (err) {
        if (!isMounted) return;
        console.error("שגיאה לא צפויה:", err)
        setError(`שגיאה לא צפויה: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
      }
    }
    
    checkAuth()
    
    // ניקוי בעת unmount
    return () => {
      isMounted = false;
    }
  }, [router, supabase, targetUserId])

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">טוען...</div>
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">שגיאה</h2>
          <p className="text-gray-700">{error}</p>
          <div className="mt-6">
            <button 
              onClick={() => router.push('/login')}
              className="w-full py-2 px-4 bg-primary text-white rounded-md"
            >
              חזרה לדף התחברות
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return <div className="flex justify-center items-center min-h-screen">אין לך הרשאה לצפות בדף זה</div>
  }

  return (
    <div className="container mx-auto p-6">
      {userId && (
        <>
          {targetUserInfo ? (
            // מצב צפייה בנציג אחר
            <div className="mb-6 p-4 bg-blue-100 rounded-md border border-blue-200">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium text-lg text-blue-900">צפייה בנציג: {targetUserInfo.full_name || 'ללא שם'}</span>
                  <p className="text-sm text-blue-600 mt-1">{targetUserInfo.email}</p>
                </div>
                <button 
                  onClick={() => router.push('/dashboard/manager')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  חזרה לדשבורד מנהל
                </button>
              </div>
            </div>
          ) : (
            // מצב צפייה רגילה (נציג צופה בעצמו)
            <div className="mb-6 p-3 bg-gray-100 rounded-md">
              <div className="flex justify-between items-center">
                <span className="font-medium">דשבורד נציג אישי</span>
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  חזרה לממשק ראשי
                </button>
              </div>
            </div>
          )}
          
          <AgentDashboardClient key={userId} userId={userId} />
        </>
      )}
    </div>
  )
} 