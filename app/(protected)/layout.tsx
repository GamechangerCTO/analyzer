import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import Sidebar from '@/components/Sidebar'
import { LEGAL_TERMS_VERSION } from '@/lib/constants'
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

  // דרישת אישור תקנון למנהלים בביקור ראשון מטופלת בהמשך הקובץ

  // בדיקה אם יש חובת החלפת סיסמה (נציגים חדשים)
  // רק אם לא נמצאים כבר בדף החלפת הסיסמה
  const forcePasswordChange = user.user_metadata?.force_password_change
  if (forcePasswordChange) {
    // הגישה לדף change-password מתוכננת דרך layout נפרד
    // כאן פשוט נדרוס את הגישה לשאר הדפים
    redirect('/change-password')
  }

  // דרישת אישור תקנון למנהלים/בעלים לפני גישה ראשונה
  if (userData.role === 'manager' || userData.role === 'owner') {
    const { data: acceptance } = await supabase
      .from('legal_terms_acceptances')
      .select('id')
      .eq('user_id', user.id)
      .eq('terms_version', LEGAL_TERMS_VERSION)
      .maybeSingle()

    if (!acceptance && !isAdmin) {
      redirect('/legal-terms?requireApproval=1')
    }
  }

  // ✅ בדיקת שאלון חברה - חובה לכל הפעולות (חוץ מדף השאלון עצמו)
  let questionnaireComplete = true
  
  // בדיקת הנתיב הנוכחי
  const headersList = headers()
  const pathname = headersList.get("x-pathname") || ""
  const isQuestionnairePage = pathname.includes("company-questionnaire")
  
  if (userData.company_id) {
    const { data: questionnaire } = await supabase
      .from('company_questionnaires')
      .select('is_complete')
      .eq('company_id', userData.company_id)
      .single()
    
    questionnaireComplete = questionnaire?.is_complete === true
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
        (activeSubscription.expires_at === null || new Date(activeSubscription.expires_at) > new Date())

      console.log('Protected Layout - Subscription validation:', {
        activeSubscription: activeSubscription ? {
          id: activeSubscription.id,
          is_active: activeSubscription.is_active,
          expires_at: activeSubscription.expires_at,
          is_expired: activeSubscription.expires_at ? new Date(activeSubscription.expires_at) <= new Date() : false
        } : null,
        hasActiveSubscription
      })

      if (!hasActiveSubscription) {
        console.log('Protected Layout - Non-POC manager without valid subscription, redirecting to subscription setup')
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
            {/* ✅ פופאפ שאלון נדרש */}
            {!questionnaireComplete && !isQuestionnairePage && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                
                <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
                    🛑 השאלון לא הושלם
                  </h2>
                  
                  <p className="text-gray-600 text-center mb-6 leading-relaxed">
                    {(userData.role === 'manager' || userData.role === 'admin') ? (
                      <>
                        כדי להשתמש במערכת, יש למלא את <strong>שאלון החברה</strong> תחילה.
                        <br />
                        השאלון עוזר לנו להתאים את הניתוחים וההמלצות לעסק שלך.
                      </>
                    ) : (
                      <>
                        מנהל החברה טרם מילא את <strong>שאלון החברה</strong>.
                        <br />
                        אנא פנה למנהל שלך כדי שימלא את השאלון.
                      </>
                    )}
                  </p>
                  
                  <div className="space-y-3">
                    {(userData.role === 'manager' || userData.role === 'admin') ? (
                      <a
                        href="/company-questionnaire"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        מלא שאלון עכשיו
                      </a>
                    ) : (
                      <a
                        href="/dashboard"
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        חזור לדשבורד
                      </a>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-400 text-center mt-4">
                    מילוי השאלון לוקח כ-5 דקות בלבד
                  </p>
                </div>
              </div>
            )}
            
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
                href="/legal-terms" 
                className="text-glacier-neutral-500 hover:text-glacier-primary-600 underline decoration-glacier-accent decoration-2 underline-offset-4 transition-colors duration-200 coachee-interactive"
                target="_blank"
                rel="noopener noreferrer"
              >
                תקנון משפטי
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
