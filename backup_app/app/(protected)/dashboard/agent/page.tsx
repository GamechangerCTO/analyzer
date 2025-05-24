'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// טיפוסים
interface AgentDashboardClientProps {
  userId: string;
}

// קומפוננטה זמנית פשוטה במקום AgentDashboardClient
function SimpleAgentDashboard({ userId }: AgentDashboardClientProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">ממשק נציג</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-md">
          <h3 className="text-lg font-medium mb-2">פרטי המשתמש</h3>
          <p><strong>מזהה משתמש:</strong> {userId}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-md">
          <h3 className="text-lg font-medium mb-2">נתוני שיחות</h3>
          <p>נתוני השיחות יוצגו כאן לאחר טעינה מהשרת</p>
        </div>
      </div>
    </div>
  )
}

export default function AgentDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (!user || userError) {
          router.push('/login')
          return
        }

        // בדיקה האם זה מנהל המערכת
        const isAdmin = user.email === 'ido.segev23@gmail.com'
        
        if (isAdmin) {
          // מנהל מערכת תמיד רשאי לצפות כנציג
          setIsAuthorized(true)
          setUserId(user.id)
          setLoading(false)
          return
        }
        
        // בדיקת משתמש לפי אימייל
        const { data: userData, error: emailCheckError } = await supabase
          .from('users')
          .select('role, is_approved')
          .eq('email', user.email)
          .maybeSingle()
        
        // אם לא נמצא לפי אימייל, בדיקה לפי מזהה
        if (emailCheckError || !userData) {
          const { data: userDataById, error: userByIdError } = await supabase
            .from('users')
            .select('role, is_approved')
            .eq('id', user.id)
            .maybeSingle()
          
          if (userByIdError || !userDataById) {
            setError("לא נמצאו פרטי משתמש במערכת. אנא פנה למנהל המערכת.")
            setLoading(false)
            return
          }
          
          if (!userDataById.is_approved) {
            router.push('/not-approved?reason=pending')
            return
          }
          
          // בדיקה האם הוא נציג או בעל תפקיד גבוה יותר
          if (userDataById.role !== 'agent' && userDataById.role !== 'admin') {
            router.push('/dashboard/manager')
            return
          }
          
          // אישור גישה
          setIsAuthorized(true)
          setUserId(user.id)
          setLoading(false)
          return
        }
        
        if (!userData.is_approved) {
          router.push('/not-approved?reason=pending')
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
        console.error("שגיאה לא צפויה:", err)
        setError(`שגיאה לא צפויה: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [supabase, router])

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
          <h1 className="text-3xl font-bold mb-6">דשבורד נציג</h1>
          
          <div className="mb-6 p-3 bg-blue-100 rounded-md">
            <div className="flex justify-between items-center">
              <span className="font-medium">נציג</span>
              <button 
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
              >
                חזרה לממשק מנהל מערכת
              </button>
            </div>
          </div>
          
          <SimpleAgentDashboard userId={userId} />
        </>
      )}
    </div>
  )
} 