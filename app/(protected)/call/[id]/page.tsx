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
    <div className="min-h-screen bg-gradient-to-br from-brand-primary/5 via-brand-secondary/8 to-neutral-50">
      {/* Header with brand design */}
      <div className="relative">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10"></div>
        
        {/* Brand styled header */}
        <div className="relative bg-white border-b-2 border-brand-primary/20 shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6 rtl:space-x-reverse">
                {/* Logo/Icon with brand styling */}
                <div className="flex items-center justify-center w-16 h-16 rounded-tl-2xl rounded-br-2xl bg-gradient-to-br from-brand-primary to-brand-secondary border-2 border-white shadow-xl">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent mb-2">
                    Coachee - ניתוח שיחה מקצועי
                  </h1>
                  <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm text-neutral-600">
                    <span className="px-3 py-1 bg-neutral-100 border border-neutral-200 rounded-tl-xl rounded-br-xl">
                      📅 {new Date(callData.created_at).toLocaleDateString('he-IL')}
                    </span>
                    <span className="px-3 py-1 bg-neutral-100 border border-neutral-200 rounded-tr-xl rounded-bl-xl">
                      👤 {callData.users?.full_name || callData.users?.email}
                    </span>
                    {callData.companies?.name && (
                      <span className="px-3 py-1 bg-neutral-100 border border-neutral-200 rounded-tl-xl rounded-br-xl">
                        🏢 {callData.companies.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <a 
                href="/dashboard"
                className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary-dark hover:to-brand-secondary-dark text-white rounded-tl-2xl rounded-br-2xl transition-all duration-300 font-medium shadow-xl hover:shadow-2xl hover:scale-105 border border-white/20"
              >
                <ArrowRight className="w-5 h-5 mr-2 group-hover:transform group-hover:translate-x-1 transition-transform duration-300" />
                חזרה לדשבורד
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content with brand styling */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-tl-3xl rounded-br-3xl border-2 border-brand-primary/20 shadow-2xl p-1">
          <div className="bg-white rounded-tl-3xl rounded-br-3xl border border-neutral-200 shadow-inner">
            <CallAnalysis call={callData as any} audioUrl={audioUrl} userRole={userData?.role} />
          </div>
        </div>
      </div>
    </div>
  )
} 