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
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">ניתוח שיחה</h1>
        <a 
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
        >
          חזרה לדשבורד
        </a>
      </div>
      
      <CallAnalysis call={callData as any} audioUrl={audioUrl} userRole={userData?.role} />
    </div>
  )
} 