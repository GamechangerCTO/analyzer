import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import Sidebar from '@/components/Sidebar'
import React from 'react'
import { Building } from 'lucide-react'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerComponentClient({ cookies })
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  console.log('Protected Layout - Auth check:', { 
    user: user ? `${user.email} (${user.id})` : 'null', 
    error: error?.message 
  })
  
  if (!user || error) {
    console.log('Protected Layout - Redirecting to login, no user or error:', error?.message)
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
    console.log('Protected Layout - User not found by email, trying by ID')
    const { data: userDataById, error: idError } = await supabase
      .from('users')
      .select('id, role, is_approved, company_id')
      .eq('id', user.id)
      .maybeSingle()
    
    if (!idError && userDataById) {
      userData = userDataById
      console.log('Protected Layout - User found by ID:', userDataById)
    } else {
      console.log('Protected Layout - User not found in database, redirecting to not-found')
      // אם המשתמש לא קיים במערכת מפנים לדף שגיאה
      redirect('/not-approved?reason=not-found')
    }
  } else {
    console.log('Protected Layout - User found by email:', userData)
  }
  
  // בדיקה שהמשתמש מאושר
  if (!userData.is_approved && !isAdmin) {
    console.log('Protected Layout - User not approved, redirecting to not-approved')
    redirect('/not-approved?reason=pending')
  }

  console.log('Protected Layout - Auth successful, rendering page for:', user.email)

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
                <Building className="w-5 h-5 text-white" />
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