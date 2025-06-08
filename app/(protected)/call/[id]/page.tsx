import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import React from 'react'
import CallAnalysis from '@/components/CallAnalysis'

interface CallPageProps {
  params: {
    id: string
  }
}

export default async function CallPage({ params }: CallPageProps) {
  const { id } = params
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (!user || userError) {
    redirect('/login')
  }
  
  // בדיקת הרשאות (רק המשתמש שהעלה את השיחה, או מנהל, יכולים לצפות בה)
  const { data: userData } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()
  
  // קבלת נתוני השיחה
  const { data: callData, error: callError } = await supabase
    .from('calls')
    .select(`
      *,
      users (id, full_name, email),
      companies (id, name)
    `)
    .eq('id', id)
    .single()
  
  if (callError || !callData) {
    notFound()
  }
  
  // בדיקת הרשאות - רק המשתמש שהעלה את השיחה או משתמש מאותה חברה עם תפקיד מנהל יכול לצפות
  const isOwner = callData.user_id === user.id
  const isManager = userData?.role === 'manager' || userData?.role === 'owner'
  const isSameCompany = userData?.company_id === callData.company_id
  
  if (!isOwner && !(isManager && isSameCompany)) {
    redirect('/dashboard')
  }
  
  // קבלת קישור לקובץ האודיו
  let audioUrl = null
  if (callData.audio_file_path) {
    const { data } = await supabase.storage
      .from('audio_files')
      .createSignedUrl(callData.audio_file_path, 3600) // 1 hour expiry
    
    audioUrl = data?.signedUrl || null
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header מעוצב */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">ניתוח שיחה מקצועי</h1>
              <p className="text-gray-600">תוצאות מפורטות וממוקדות לשיפור הביצועים</p>
            </div>
            <a 
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-md"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              חזרה לדשבורד
            </a>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <CallAnalysis call={callData as any} audioUrl={audioUrl} userRole={userData?.role} />
      </div>
    </div>
  )
} 