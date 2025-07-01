'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false)
  const [isNotificationsMenuOpen, setIsNotificationsMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          router.push('/login')
          return
        }
        
        setUserEmail(user.email || null)
        
        if (!user.email) {
          setError("לא נמצא כתובת אימייל למשתמש")
          setLoading(false)
          return
        }
        
        if (user.email === 'ido.segev23@gmail.com') {
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email!)
            .maybeSingle()
          
          if (!existingUser) {
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email,
                role: 'admin',
                full_name: 'מנהל מערכת',
                company_id: '11111111-1111-1111-1111-111111111111',
                is_approved: true
              })
            
            if (insertError) {
              setError(`שגיאה ביצירת משתמש: ${insertError.message}`)
              setLoading(false)
              return
            }
          }
          
          router.push('/dashboard/admin')
          return
        }
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, company_id, is_approved')
          .eq('email', user.email!)
          .single()
        
        if (userError) {
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
          
          if (userDataById.role === 'admin') {
            router.push('/dashboard/admin')
            return
          } else if (userDataById.role === 'manager') {
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
          router.push('/not-approved?reason=not-found')
          return
        }
        
        if (!userData.is_approved) {
          router.push('/not-approved?reason=pending')
          return
        }
        
        if (userData.role === 'admin') {
          router.push('/dashboard/admin')
          return
        } else if (userData.role === 'manager') {
          router.push('/dashboard/manager')
        } else if (userData.role === 'agent') {
          router.push('/dashboard/agent')
        } else {
          setError(`תפקיד לא מוכר: ${userData.role}`)
          setLoading(false)
        }
      } catch (err) {
        setError(`שגיאה לא צפויה: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-glass-white to-glass-light flex items-center justify-center">
        <div className="choacee-card-glass p-8 text-center">
          <div className="choacee-loading-shimmer w-16 h-16 rounded-clay mx-auto mb-4"></div>
          <h2 className="choacee-text-body text-xl font-semibold text-neutral-800">טוען...</h2>
          <p className="text-neutral-500 mt-2">מתחבר למערכת</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-glass-white to-glass-light flex items-center justify-center p-4">
        <div className="choacee-card-clay-raised max-w-md w-full p-8 text-center">
          <div className="choacee-card-clay-pressed rounded-clay p-4 w-16 h-16 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-8 h-8 text-clay-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h2 className="choacee-text-body text-2xl font-bold text-clay-danger mb-4">שגיאה במערכת</h2>
          <p className="choacee-text-body text-neutral-700 mb-6">{error}</p>
          
          <button 
            onClick={() => router.push('/login')}
            className="choacee-btn-clay-primary w-full"
          >
            חזרה לדף התחברות
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-glass-white to-glass-light flex items-center justify-center">
      <div className="choacee-card-glass p-8 text-center">
        <div className="choacee-loading-shimmer w-16 h-16 rounded-clay mx-auto mb-4"></div>
        <h2 className="choacee-text-body text-xl font-semibold text-neutral-800">מכוון אותך...</h2>
        <p className="text-neutral-500 mt-2">מעבר לדשבורד המתאים</p>
      </div>
    </div>
  )
} 