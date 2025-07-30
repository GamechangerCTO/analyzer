import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import Sidebar from '@/components/Sidebar'
import React from 'react'
import { Building } from 'lucide-react'
import Image from 'next/image'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerComponentClient({ cookies })
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (!user || error) {
    redirect('/login')
  }

  // על פי memory bank - דפוס זיהוי משתמשים כפול: ID ו-email
  // זה הדפוס הנכון ממערכת הביטחון של הפרויקט
  const isAdmin = user.email === 'ido.segev23@gmail.com'
  
  // בדיקה האם המשתמש קיים במערכת ומאושר - תחילה לפי email (דפוס ראשי)
  let { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role, is_approved, company_id')
    .eq('email', user.email!)
    .maybeSingle()
  
  // אם לא נמצא לפי email, נסה לפי ID (דפוס משני)
  if (userError || !userData) {
    const { data: userDataById, error: idError } = await supabase
      .from('users')
      .select('id, role, is_approved, company_id')
      .eq('id', user.id)
      .maybeSingle()
    
    if (!idError && userDataById) {
      userData = userDataById
    } else {
      // אם המשתמש לא קיים במערכת מפנים לדף שגיאה
      redirect('/not-approved?reason=not-found')
    }
  }
  
  // בדיקה שהמשתמש מאושר
  if (!userData.is_approved && !isAdmin) {
    redirect('/not-approved?reason=pending')
  }

  // בדיקה אם מנהל ללא חבילה - הפניה לבחירת חבילה (רק אם זה לא POC)
  if ((userData.role === 'manager' || userData.role === 'owner') && userData.company_id) {
    console.log('Protected Layout - Auth check:', {
      user: `${user.email} (${user.id})`,
      error: error || undefined
    })
    
    console.log('Protected Layout - User found by email:', {
      id: userData.id,
      role: userData.role,
      is_approved: userData.is_approved,
      company_id: userData.company_id
    })
    
    console.log('Protected Layout - Checking subscription for manager, company_id:', userData.company_id)
    
    // בדיקה אם החברה היא POC - POC לא צריכות מנוי
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('is_poc')
      .eq('id', userData.company_id)
      .single()

    if (companyError) {
      console.error('Protected Layout - Company query error:', companyError)
    }

    const isPocCompany = companyData?.is_poc || false
    console.log('Protected Layout - Company POC status:', { isPocCompany })

    // אם זה חברת POC, לא צריך לבדוק מנוי
    if (isPocCompany) {
      console.log('Protected Layout - POC company detected, skipping subscription check')
    } else {
      // חיפוש מנוי פעיל רק עבור חברות שאינן POC
      const { data: subscriptions, error: subError } = await supabase
        .from('company_subscriptions')
        .select('id, plan_id, is_active, starts_at, expires_at')
        .eq('company_id', userData.company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      console.log('Protected Layout - Subscription query result:', {
        subscriptions,
        subError: subError?.message,
        hasSubscription: !!(subscriptions && subscriptions.length > 0)
      })

      if (subError) {
        console.error('Protected Layout - Subscription query error:', subError)
      }

      // בדיקה שיש מנוי פעיל וכן תקף (לא פג תוקף)
      const activeSubscription = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null
      const hasActiveSubscription = activeSubscription && 
        activeSubscription.is_active && 
        new Date(activeSubscription.expires_at) > new Date()

      if (!hasActiveSubscription) {
        console.log('Protected Layout - Non-POC manager without subscription, redirecting to subscription setup')
        redirect('/subscription-setup?reason=no-subscription')
      }
      
      console.log('Protected Layout - Subscription found, allowing access:', activeSubscription)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-glacier-primary/5 via-white to-glacier-accent/5">
      <Sidebar user={user} userData={userData} />
      
      {/* Mobile top spacer */}
      <div className="lg:hidden h-16" />
      
      {/* Main content area - תיקון ל-RTL עם margin מימין במקום padding משמאל */}
      <div className="lg:mr-72 min-h-screen">
        <main className="min-h-screen p-4 sm:p-6 lg:p-8">
          <div className="coachee-smooth-appear w-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        
        <footer className="coachee-glass border-t border-glacier-neutral-200/50 py-8 mx-4 sm:mx-6 lg:mx-8 mb-6 lg:mb-8 rounded-t-3xl">
          <div className="text-center text-glacier-neutral-600 text-sm">
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-8 mb-6">
              <a 
                href="/privacy-policy" 
                className="text-glacier-neutral-500 hover:text-glacier-primary-600 underline decoration-glacier-accent decoration-2 underline-offset-4 transition-colors duration-200 coachee-interactive"
                target="_blank"
                rel="noopener noreferrer"
              >
                מדיניות פרטיות
              </a>
              <a 
                href="/terms-of-service" 
                className="text-glacier-neutral-500 hover:text-glacier-primary-600 underline decoration-glacier-accent decoration-2 underline-offset-4 transition-colors duration-200 coachee-interactive"
                target="_blank"
                rel="noopener noreferrer"
              >
                תנאי שירות
              </a>
            </div>
            
            <div className="flex justify-center items-center space-x-4 mb-4">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-glacier-primary-500 to-glacier-accent-500 flex items-center justify-center shadow-glacier-soft">
                <Image
                  src="/logo.png"
                  alt="Coachee Logo"
                  width={20}
                  height={20}
                />
              </div>
              <span className="text-glacier-neutral-800 font-semibold">Coachee</span>
            </div>
            
            <p className="text-xs text-glacier-neutral-500">
              פלטפורמת אימון מכירות ושירות מתקדמת | © 2024 כל הזכויות שמורות
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
} 