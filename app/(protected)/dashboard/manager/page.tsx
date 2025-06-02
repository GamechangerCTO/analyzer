'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ManagerDashboardClient from './ManagerDashboardClient'

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
        console.log('🔍 Starting auth check...')
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        console.log('👤 User from auth:', user?.email, user?.id)
        console.log('❌ User error:', userError)
        
        if (!user || userError) {
          console.log('❌ No user or user error, redirecting to login')
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
        console.log('👑 Is admin?', isAdmin)
        
        if (isAdmin) {
          console.log('✅ Admin user detected, setting up admin access')
          // מנהל מערכת תמיד רשאי לצפות כמנהל
          setIsAuthorized(true)
          setUserId(user.id)
          setCompanyId('11111111-1111-1111-1111-111111111111') // מזהה חברה מוגדר
          setLoading(false)
          return
        }
        
        console.log('🔍 Checking user by email...')
        // בדיקת משתמש לפי אימייל
        const { data: userData, error: emailCheckError } = await supabase
          .from('users')
          .select('role, company_id, is_approved')
          .eq('email', user.email!)
          .maybeSingle()
        
        console.log('📧 User data by email:', userData)
        console.log('❌ Email check error:', emailCheckError)
        
        // אם לא נמצא לפי אימייל, בדיקה לפי מזהה
        if (emailCheckError || !userData) {
          console.log('🔍 Checking user by ID...')
          const { data: userDataById, error: userByIdError } = await supabase
            .from('users')
            .select('role, company_id, is_approved')
            .eq('id', user.id)
            .maybeSingle()
          
          console.log('🆔 User data by ID:', userDataById)
          console.log('❌ User by ID error:', userByIdError)
          
          if (userByIdError || !userDataById) {
            console.log('❌ No user data found')
            setError("לא נמצאו פרטי משתמש במערכת. אנא פנה למנהל המערכת.")
            setLoading(false)
            return
          }
          
          if (!userDataById.is_approved) {
            console.log('❌ User not approved')
            router.push('/not-approved?reason=pending')
            return
          }
          
          console.log('👤 User role:', userDataById.role)
          
          // רק מנהלים ובעלים יכולים לגשת לדף זה
          if (userDataById.role !== 'manager' && userDataById.role !== 'owner') {
            if (userDataById.role === 'admin') {
              console.log('✅ Admin role detected via ID check')
              // מנהל מערכת יכול לצפות בכל דף - נתן לו חברה ברירת מחדל
              setIsAuthorized(true)
              setUserId(user.id)
              setCompanyId(userDataById.company_id || '11111111-1111-1111-1111-111111111111')
              setLoading(false)
            } else {
              console.log('❌ Unauthorized role, redirecting to agent dashboard')
              router.push('/dashboard/agent')
            }
            return
          }
          
          console.log('✅ Manager/Owner access granted via ID check')
          console.log('🏢 Company ID:', userDataById.company_id)
          
          // אם אין company_id, ננסה למצוא חברה ברירת מחדל או ליצור אחת
          let finalCompanyId = userDataById.company_id
          if (!finalCompanyId) {
            console.log('⚠️ No company_id found, trying to find a default company...')
            // בואו ננסה למצוא חברה כלשהי במערכת
            const { data: companies, error: companiesError } = await supabase
              .from('companies')
              .select('id')
              .limit(1)
            
            if (!companiesError && companies && companies.length > 0) {
              finalCompanyId = companies[0].id
              console.log('🏢 Found default company:', finalCompanyId)
            } else {
              finalCompanyId = '11111111-1111-1111-1111-111111111111'
              console.log('🏢 Using fallback company ID')
            }
          }
          
          // אישור גישה למנהל
          setIsAuthorized(true)
          setUserId(user.id)
          setCompanyId(finalCompanyId)
          setLoading(false)
          return
        }
        
        if (!userData.is_approved) {
          console.log('❌ User not approved (email check)')
          router.push('/not-approved?reason=pending')
          return
        }
        
        console.log('👤 User role (email check):', userData.role)
        
        // רק מנהלים ובעלים יכולים לגשת לדף זה
        if (userData.role !== 'manager' && userData.role !== 'owner') {
          if (userData.role === 'admin') {
            console.log('✅ Admin role detected via email check')
            // מנהל מערכת יכול לצפות בכל דף
            setIsAuthorized(true)
            setUserId(user.id)
            setCompanyId(userData.company_id || '11111111-1111-1111-1111-111111111111')
            setLoading(false)
          } else {
            console.log('❌ Unauthorized role, redirecting to agent dashboard')
            router.push('/dashboard/agent')
          }
          return
        }
        
        console.log('✅ Manager/Owner access granted via email check')
        console.log('🏢 Company ID:', userData.company_id)
        
        // אם אין company_id, ננסה למצוא חברה ברירת מחדל או ליצור אחת
        let finalCompanyId = userData.company_id
        if (!finalCompanyId) {
          console.log('⚠️ No company_id found, trying to find a default company...')
          // בואו ננסה למצוא חברה כלשהי במערכת
          const { data: companies, error: companiesError } = await supabase
            .from('companies')
            .select('id')
            .limit(1)
          
          if (!companiesError && companies && companies.length > 0) {
            finalCompanyId = companies[0].id
            console.log('🏢 Found default company:', finalCompanyId)
          } else {
            finalCompanyId = '11111111-1111-1111-1111-111111111111'
            console.log('🏢 Using fallback company ID')
          }
        }
        
        // אישור גישה למנהל אמיתי
        setIsAuthorized(true)
        setUserId(user.id)
        setCompanyId(finalCompanyId)
        setLoading(false)
      } catch (err) {
        console.error("💥 Unexpected error:", err)
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
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
          <div className="text-center">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h2 className="text-2xl font-bold text-red-600 mb-4">שגיאה</h2>
            <p className="text-gray-700 mb-6">{error}</p>
            <button 
              onClick={() => router.push('/login')}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
        <div className="text-center">
          <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <h2 className="text-xl font-bold text-gray-800 mb-2">אין הרשאה</h2>
          <p className="text-gray-600">אין לך הרשאה לצפות בדף זה</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Debug information */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-100 p-4 m-4 rounded-lg text-sm">
          <p><strong>Debug:</strong></p>
          <p>userId: {userId || 'null'}</p>
          <p>companyId: {companyId || 'null'}</p>
          <p>isAuthorized: {isAuthorized.toString()}</p>
        </div>
      )}
      
      {userId && companyId ? (
        <ManagerDashboardClient 
          userId={userId}
          companyId={companyId} 
        />
      ) : (
        <div className="flex justify-center items-center min-h-screen bg-gray-50">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
            <svg className="w-16 h-16 text-orange-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h2 className="text-xl font-bold text-gray-800 mb-2">חסרים נתוני חברה</h2>
            <p className="text-gray-600 mb-4">לא נמצא מזהה חברה עבור המשתמש</p>
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg mb-4">
              <p><strong>מזהה משתמש:</strong> {userId || 'חסר'}</p>
              <p><strong>מזהה חברה:</strong> {companyId || 'חסר'}</p>
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                נסה שוב
              </button>
              <button 
                onClick={() => router.push('/dashboard')}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                חזרה לדשבורד ראשי
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 