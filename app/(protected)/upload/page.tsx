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
    <div className="min-h-screen bg-gradient-to-br from-glacier-primary/20 via-glacier-accent/30 to-glacier-secondary/20">
      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <nav className="flex items-center space-x-3 text-sm">
            <Link 
              href="/dashboard" 
              className="flex items-center px-4 py-2 bg-white/90 hover:bg-white text-neutral-800 hover:text-neutral-900 rounded-full transition-all duration-200 font-semibold backdrop-blur-sm shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              דשבורד
            </Link>
            <svg className="w-4 h-4 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="px-4 py-2 bg-gradient-to-r from-glacier-primary to-glacier-accent text-neutral-900 rounded-full text-sm font-bold shadow-lg">העלאת שיחה</span>
          </nav>
          
          {/* Company Badge */}
          {userData?.companies?.name && (
            <div className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm text-neutral-700 border-2 border-neutral-300 shadow-sm">
              חברה: <span className="font-bold text-neutral-900">{userData.companies.name}</span>
            </div>
          )}
        </div>

        {/* Main Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-glacier-primary to-glacier-accent rounded-full shadow-2xl mb-8 relative border-4 border-white">
            <div className="absolute inset-0 bg-gradient-to-br from-glacier-primary/80 to-glacier-accent/80 rounded-full animate-pulse opacity-75"></div>
            <svg className="w-12 h-12 text-neutral-900 relative z-10 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <h1 className="text-6xl font-bold text-neutral-900 mb-6 drop-shadow-lg">
            העלאת שיחה
          </h1>
          
          <p className="text-2xl text-neutral-800 max-w-3xl mx-auto leading-relaxed font-medium drop-shadow-sm">
            העלה שיחה וקבל ניתוח מפורט עם תובנות מעשיות לשיפור הביצועים
          </p>
          
          {/* Floating Stats */}
          <div className="flex items-center justify-center space-x-8 mt-10">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-4 border-2 border-glacier-primary/50 shadow-lg">
              <div className="text-2xl font-bold text-neutral-900">2-5</div>
              <div className="text-sm text-neutral-700 font-medium">דקות עיבוד</div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-4 border-2 border-glacier-accent/50 shadow-lg">
              <div className="text-2xl font-bold text-neutral-900">100%</div>
              <div className="text-sm text-neutral-700 font-medium">דיוק ניתוח</div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-4 border-2 border-glacier-success/50 shadow-lg">
              <div className="text-2xl font-bold text-neutral-900">מקצועי</div>
              <div className="text-sm text-neutral-700 font-medium">ביותר</div>
            </div>
          </div>
        </div>

        {/* Upload Form Section */}
        <div className="relative">
          {/* Background Decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-glacier-primary/10 to-glacier-accent/10 rounded-3xl transform rotate-1"></div>
          <div className="absolute inset-0 bg-gradient-to-l from-glacier-accent/15 to-glacier-secondary/15 rounded-3xl transform -rotate-1"></div>
          
          {/* Main Upload Container */}
          <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-neutral-200 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-glacier-primary via-glacier-accent to-glacier-secondary"></div>
            
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
          <div className="inline-flex items-center space-x-6 bg-neutral-800 text-white rounded-full px-8 py-4 shadow-xl">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-glacier-primary rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold">איכות שמע ברורה</span>
            </div>
            <div className="w-px h-6 bg-white/30"></div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-glacier-accent rounded-full animate-pulse delay-200"></div>
              <span className="text-sm font-semibold">בחירת סוג שיחה מדויק</span>
            </div>
            <div className="w-px h-6 bg-white/30"></div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-glacier-success rounded-full animate-pulse delay-400"></div>
              <span className="text-sm font-semibold">ניתוח תוך דקות</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
} 