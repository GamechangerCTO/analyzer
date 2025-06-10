import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import React from 'react'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
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
    <div className="min-h-screen flex flex-col bg-cream-sand-light">
      <Navbar user={user} userData={userData} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="smooth-appear">
          {children}
        </div>
      </main>
      <footer className="bg-white shadow-soft border-t border-ice-gray py-6">
        <div className="container mx-auto px-4 text-center text-indigo-night/70 text-sm">
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-6 mb-4">
            <a 
              href="/privacy-policy" 
              className="text-indigo-night/70 hover:text-indigo-night underline decoration-lemon-mint decoration-2 underline-offset-4 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              מדיניות פרטיות
            </a>
            <a 
              href="/terms-of-service" 
              className="text-indigo-night/70 hover:text-indigo-night underline decoration-lemon-mint decoration-2 underline-offset-4 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              תנאי שירות
            </a>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-display font-semibold text-indigo-night">ReplayMe</span>
            <span>&copy; {new Date().getFullYear()}</span>
            <span className="text-lemon-mint-dark">•</span>
            <span>חדר כושר למכירות</span>
          </div>
        </div>
      </footer>
    </div>
  )
} 