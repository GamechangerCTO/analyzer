import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import React from 'react'
import CallAnalysis from '@/components/CallAnalysis'
import { Brain, ArrowRight } from 'lucide-react'

interface CallPageProps {
  params: {
    id: string
  }
}

export default async function CallPage({ params }: CallPageProps) {
  const { id } = params
  const supabase = createClient()
  
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
  const isCallOwner = callData.user_id === user.id
  const isManager = userData?.role === 'manager'
  const isSameCompany = userData?.company_id === callData.company_id
  
  if (!isCallOwner && !(isManager && isSameCompany)) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header מעוצב בסגנון Glacier */}
      <div className="relative">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/20 to-blue-900/20"></div>
        
        {/* Glassmorphism header */}
        <div className="relative backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-2xl">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6 rtl:space-x-reverse">
                {/* Logo/Icon עם גלס מורפיזם */}
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 backdrop-blur-sm border border-white/30 shadow-xl">
                  <Brain className="w-8 h-8 text-blue-600" />
                </div>
                
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent mb-2">
                    Coachee - ניתוח שיחה מקצועי
                  </h1>
                  <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm text-slate-600">
                    <span className="px-3 py-1 bg-white/50 backdrop-blur-sm rounded-full border border-white/30">
                      📅 {new Date(callData.created_at).toLocaleDateString('he-IL')}
                    </span>
                    <span className="px-3 py-1 bg-white/50 backdrop-blur-sm rounded-full border border-white/30">
                      👤 {callData.users?.full_name || callData.users?.email}
                    </span>
                    {callData.companies?.name && (
                      <span className="px-3 py-1 bg-white/50 backdrop-blur-sm rounded-full border border-white/30">
                        🏢 {callData.companies.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <a 
                href="/dashboard"
                className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-300 font-medium shadow-xl hover:shadow-2xl hover:scale-105 backdrop-blur-sm border border-white/20"
              >
                <ArrowRight className="w-5 h-5 mr-2 group-hover:transform group-hover:translate-x-1 transition-transform duration-300" />
                חזרה לדשבורד
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content עם גלס מורפיזם */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-1">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-white/30 shadow-inner">
            <CallAnalysis call={callData as any} audioUrl={audioUrl} userRole={userData?.role} />
          </div>
        </div>
      </div>
    </div>
  )
} 