import React from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface NotApprovedPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function NotApprovedPage({ searchParams }: NotApprovedPageProps) {
  const reason = searchParams.reason || 'pending'
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // בדיקה אם המשתמש קיים בטבלת users
  let userData = null
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    
    userData = data
  }
  
  let title = 'ממתין לאישור'
  let message = 'חשבון המשתמש שלך ממתין לאישור מנהל המערכת. אנא המתן לאישור לפני שתוכל להשתמש במערכת.'
  
  if (reason === 'not-found') {
    title = 'משתמש לא קיים'
    message = 'לא נמצא רישום משתמש במערכת. אנא פנה למנהל המערכת כדי להירשם.'
  }
  
  const handleSignOut = async () => {
    'use server'
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    await supabase.auth.signOut()
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {title}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {message}
          </p>
        </div>
        
        {user && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900">פרטי משתמש:</h3>
            <p className="mt-2 text-sm text-gray-600">
              <strong>שם משתמש:</strong> {user.email}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              <strong>מזהה:</strong> {user.id}
            </p>
            {userData && (
              <p className="mt-1 text-sm text-gray-600">
                <strong>תפקיד:</strong> {userData.role}
              </p>
            )}
          </div>
        )}
        
        <div className="mt-6 flex flex-col space-y-4">
          <Link
            href="/login"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            חזרה לדף הכניסה
          </Link>
          
          <form action={handleSignOut}>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              התנתק
            </button>
          </form>
        </div>
      </div>
    </div>
  )
} 