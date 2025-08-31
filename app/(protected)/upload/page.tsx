import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import UploadForm from '@/components/UploadForm'
import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function UploadPage() {
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (!user || error) {
    notFound()
  }
  
  // מביא את רשימת הסוגים של השיחות מטבלת הפרומפטים
  const { data: promptsData } = await supabase
    .from('prompts')
    .select('call_type')
    .eq('is_active', true)
    .order('call_type')
  
  // מביא את פרטי המשתמש ופרטי החברה שלו
  const { data: userData } = await supabase
    .from('users')
    .select(`
      id, role, full_name, email,
      companies:company_id (
        id, name
      )
    `)
    .eq('id', user.id)
    .single()
  
  const callTypes = promptsData?.map(prompt => prompt.call_type) || [
    "מכירה ישירה טלפונית",
    "פולו אפ מכירה טלפונית – לאחר שיחה ראשונית לפני מתן הצעה",
    "פולו אפ מכירה טלפונית –לאחר מתן הצעה",
    "תאום פגישה",
    "פולו אפ תאום פגישה (לפני קביעת פגישה)",
    "שירות לקוחות מגיב – בעקבות פניה של לקוח"
  ]
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-primary/10 via-brand-secondary/15 to-neutral-50">
      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <nav className="flex items-center space-x-3 text-sm">
            <Link 
              href="/dashboard" 
              className="flex items-center px-4 py-2 bg-white hover:bg-neutral-50 text-neutral-800 hover:text-neutral-900 rounded-tl-2xl rounded-br-2xl transition-all duration-200 font-semibold shadow-sm border border-neutral-200"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              דשבורד
            </Link>
            <svg className="w-4 h-4 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="px-4 py-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-tr-2xl rounded-bl-2xl text-sm font-bold shadow-lg">העלאת שיחה</span>
          </nav>
          
          {/* Company Badge */}
          {userData?.companies && Array.isArray(userData.companies) && userData.companies[0]?.name && (
            <div className="px-4 py-2 bg-white border border-neutral-200 rounded-tl-2xl rounded-br-2xl text-sm text-neutral-700 shadow-sm">
              חברה: <span className="font-bold text-neutral-900">{userData.companies[0].name}</span>
            </div>
          )}
        </div>

        {/* Main Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-tl-3xl rounded-br-3xl shadow-2xl mb-8 relative border-2 border-white">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/80 to-brand-secondary/80 rounded-tl-3xl rounded-br-3xl animate-pulse opacity-75"></div>
            <svg className="w-12 h-12 text-white relative z-10 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <h1 className="text-6xl font-bold text-neutral-900 mb-6">
            העלאת שיחה
          </h1>
          
          <p className="text-2xl text-neutral-700 max-w-3xl mx-auto leading-relaxed font-medium">
            העלה שיחה וקבל ניתוח מפורט עם תובנות מעשיות לשיפור הביצועים
          </p>
          
          {/* Floating Stats */}
          <div className="flex items-center justify-center space-x-4 mt-8">
            <div className="bg-white border-2 border-brand-primary/20 rounded-tl-2xl rounded-br-2xl px-4 py-3 shadow-lg">
              <div className="text-xl font-bold text-brand-primary">2-5</div>
              <div className="text-xs text-neutral-600 font-medium">דקות עיבוד</div>
            </div>
            <div className="bg-white border-2 border-brand-secondary/20 rounded-tr-2xl rounded-bl-2xl px-4 py-3 shadow-lg">
              <div className="text-xl font-bold text-brand-secondary">100%</div>
              <div className="text-xs text-neutral-600 font-medium">דיוק ניתוח</div>
            </div>
            <div className="bg-white border-2 border-brand-success/20 rounded-tl-2xl rounded-br-2xl px-4 py-3 shadow-lg">
              <div className="text-xl font-bold text-brand-success">מקצועי</div>
              <div className="text-xs text-neutral-600 font-medium">ביותר</div>
            </div>
          </div>
        </div>

        {/* Upload Form Section */}
        <div className="relative">
          {/* Background Decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-brand-secondary/5 rounded-tl-3xl rounded-br-3xl transform rotate-1"></div>
          <div className="absolute inset-0 bg-gradient-to-l from-brand-secondary/8 to-brand-primary/8 rounded-tr-3xl rounded-bl-3xl transform -rotate-1"></div>
          
          {/* Main Upload Container */}
          <div className="relative bg-white shadow-2xl border-2 border-neutral-200 overflow-hidden rounded-tl-3xl rounded-br-3xl">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-primary"></div>
            
            <div className="p-8">
              <UploadForm 
                user={user}
                userData={userData}
                callTypes={callTypes}
              />
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center space-x-6 bg-neutral-800 text-white rounded-tl-3xl rounded-br-3xl px-8 py-4 shadow-xl">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-brand-primary rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold">איכות שמע ברורה</span>
            </div>
            <div className="w-px h-6 bg-white/30"></div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-brand-secondary rounded-full animate-pulse delay-200"></div>
              <span className="text-sm font-semibold">בחירת סוג שיחה מדויק</span>
            </div>
            <div className="w-px h-6 bg-white/30"></div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-brand-success rounded-full animate-pulse delay-400"></div>
              <span className="text-sm font-semibold">ניתוח תוך דקות</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
} 