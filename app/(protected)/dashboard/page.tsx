'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import React from 'react'
import Link from 'next/link'

type Role = 'admin' | 'manager' | 'agent';

interface DashboardPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      try {
        // בדיקת התחברות
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          console.error("שגיאת התחברות:", authError)
          router.push('/login')
          return
        }
        
        setUserEmail(user.email || null)
        console.log("בדיקת משתמש:", user.email, "עם מזהה:", user.id)
        
        // מנהל מערכת לפי אימייל (ido.segev23@gmail.com)
        if (user.email === 'ido.segev23@gmail.com') {
          console.log("זוהה כמנהל מערכת לפי אימייל")
          
          // בדיקה האם קיים משתמש בטבלת users
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .maybeSingle()
          
          if (checkError) {
            console.error("שגיאה בבדיקת משתמש קיים:", checkError)
          }
          
          // אם המשתמש לא קיים בטבלת users, יצירת רשומה חדשה
          if (!existingUser) {
            console.log("יוצר משתמש מנהל מערכת חדש")
            
            // יצירת רשומת משתמש חדשה
            const { data: newUser, error: insertError } = await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email,
                role: 'admin',
                full_name: 'מנהל מערכת',
                company_id: '11111111-1111-1111-1111-111111111111', // חברת דוגמה
                is_approved: true
              })
              .select()
            
            if (insertError) {
              console.error("שגיאה ביצירת משתמש חדש:", insertError)
              setError(`שגיאה ביצירת משתמש: ${insertError.message}`)
              setLoading(false)
              return
            }
            
            console.log("נוצר משתמש חדש:", newUser)
          } else {
            console.log("נמצא משתמש קיים:", existingUser)
          }
          
          setLoading(false)
          return
        }
        
        // בדיקת משתמש במסד הנתונים
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, company_id, is_approved')
          .eq('email', user.email)
          .single()
        
        if (userError) {
          console.error("שגיאה בקבלת פרטי משתמש:", userError)
          
          // בדיקה אם משתמש מזוהה לפי id במקום אימייל
          const { data: userDataById, error: userByIdError } = await supabase
            .from('users')
            .select('role, company_id, is_approved')
            .eq('id', user.id)
            .single()
          
          if (userByIdError || !userDataById) {
            setError(`לא ניתן למצוא את המשתמש במערכת. אנא פנה למנהל.`)
            setLoading(false)
            return
          }
          
          if (!userDataById.is_approved) {
            router.push('/not-approved?reason=pending')
            return
          }
          
          // ניתוב לפי תפקיד
          if (userDataById.role === 'admin') {
            setLoading(false)
          } else if (userDataById.role === 'manager' || userDataById.role === 'owner') {
            router.push('/dashboard/manager')
          } else if (userDataById.role === 'agent') {
            router.push('/dashboard/agent')
          } else {
            setError(`תפקיד לא מוכר: ${userDataById.role}`)
            setLoading(false)
          }
          
          return
        }
        
        if (!userData) {
          console.log("לא נמצא משתמש במסד הנתונים")
          router.push('/not-approved?reason=not-found')
          return
        }
        
        if (!userData.is_approved) {
          router.push('/not-approved?reason=pending')
          return
        }
        
        // ניתוב לפי תפקיד
        if (userData.role === 'admin') {
          console.log("משתמש מזוהה כמנהל מערכת")
          setLoading(false)
        } else if (userData.role === 'manager' || userData.role === 'owner') {
          console.log("משתמש מזוהה כמנהל")
          router.push('/dashboard/manager')
        } else if (userData.role === 'agent') {
          console.log("משתמש מזוהה כנציג")
          router.push('/dashboard/agent')
        } else {
          console.error("תפקיד לא ידוע:", userData.role)
          setError(`תפקיד לא מוכר: ${userData.role}`)
          setLoading(false)
        }
      } catch (err) {
        console.error("שגיאה לא צפויה:", err)
        setError(`שגיאה לא צפויה: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [router, supabase])

  // תצוגה במצב טעינה
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">טוען...</div>
      </div>
    )
  }

  // הצגת שגיאה אם יש
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

  // תצוגת ממשק מנהל מערכת
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">דשבורד מנהל מערכת</h1>
      {userEmail && (
        <div className="mb-6 p-3 bg-blue-100 rounded-md">
          <p className="text-blue-800">מחובר כ: {userEmail}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-3">צפייה כ...</h2>
          <p className="text-gray-600 mb-4">בחר את סוג התפקיד שברצונך לראות</p>
          
          <div className="space-y-3">
            <Link 
              href="/dashboard"
              className="block w-full py-2 px-4 text-center bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              מנהל מערכת
            </Link>
            <Link 
              href="/dashboard/manager"
              className="block w-full py-2 px-4 text-center bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              מנהל
            </Link>
            <Link 
              href="/dashboard/agent"
              className="block w-full py-2 px-4 text-center bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              נציג
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-3">ניהול חברות</h2>
          <p className="text-gray-600 mb-4">צפייה ועריכה של חברות במערכת</p>
          <Link href="/dashboard/admin/companies" className="block w-full py-2 px-4 text-center bg-primary text-white rounded-md hover:bg-primary-dark">
            ניהול חברות
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-3">ניהול משתמשים</h2>
          <p className="text-gray-600 mb-4">צפייה ועריכה של משתמשים במערכת</p>
          <Link href="/dashboard/admin/users" className="block w-full py-2 px-4 text-center bg-primary text-white rounded-md hover:bg-primary-dark">
            ניהול משתמשים
          </Link>
        </div>
      </div>
    </div>
  )
} 