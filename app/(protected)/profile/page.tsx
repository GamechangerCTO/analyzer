'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ProfileForm from './ProfileForm'

interface UserData {
  id: string
  full_name?: string
  email: string
  role: string
  avatar_url?: string
  company_id?: string
  created_at: string
  companies?: {
    name: string
    sector?: string
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
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

        // שליפת נתוני המשתמש מטבלת users
        const { data: userProfileData, error: profileError } = await supabase
          .from('users')
          .select(`
            *,
            companies (
              name,
              sector
            )
          `)
          .eq('id', user.id)
          .maybeSingle()
        
        if (!isMounted) return;
          
        if (profileError || !userProfileData) {
          setError("לא נמצאו פרטי משתמש במערכת. אנא פנה למנהל המערכת.")
          setLoading(false)
          return
        }
        
        if (!userProfileData.is_approved) {
          router.push('/not-approved?reason=pending')
          return
        }
        
        // בדיקה שהמשתמש מאושר לגישה לפרופיל
        setUserData(userProfileData as UserData)
        setIsAuthorized(true)
        setLoading(false)
      } catch (err) {
        if (!isMounted) return;
        console.error("שגיאה לא צפויה:", err)
        setError(`שגיאה לא צפויה: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
      }
    }
    
    checkAuth()
    
    return () => {
      isMounted = false;
    }
  }, [router, supabase])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">שגיאה</h2>
          <p className="text-gray-700">{error}</p>
          <div className="mt-6">
            <button 
              onClick={() => router.push('/dashboard')}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              חזרה לדשבורד
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
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 text-right">הפרופיל שלי</h1>
          <p className="text-gray-600 text-right mt-2">ערוך את פרטיך האישיים והתאם את הפרופיל שלך</p>
        </div>
        
        <div className="p-6">
          {userData && (
            <ProfileForm 
              userData={userData} 
              onDataUpdate={(newData: Partial<UserData>) => setUserData({ ...userData, ...newData })} 
            />
          )}
        </div>
      </div>
    </div>
  )
} 