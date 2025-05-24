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
  
  if (!user || error) {
    redirect('/login')
  }

  // בדיקה האם המשתמש קיים במערכת ומאושר
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role, is_approved, company_id')
    .eq('id', user.id)
    .single()
  
  if (userError || !userData) {
    // אם המשתמש לא קיים במערכת מפנים לדף שגיאה
    redirect('/not-approved?reason=not-found')
  }
  
  // בדיקה שהמשתמש מאושר
  if (!userData.is_approved) {
    redirect('/not-approved?reason=pending')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} userData={userData} />
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-white shadow-md-top py-4">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          חדר כושר למכירות &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
} 