import { createClient } from '@/lib/supabase/server'
import UploadForm from '@/components/UploadForm'
import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Home, Upload, Clock, Target, CheckCircle } from 'lucide-react'

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
    <div className="min-h-screen bg-neutral-50">
      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-6">
          <nav className="flex items-center gap-2 text-sm">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 px-3 py-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              דשבורד
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="flex items-center gap-2 px-3 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium">
              <Upload className="w-4 h-4" />
              העלאת שיחה
            </span>
          </nav>
          
          {/* Company Badge */}
          {userData?.companies && Array.isArray(userData.companies) && userData.companies[0]?.name && (
            <div className="px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-600">
              חברה: <span className="font-medium text-neutral-900">{userData.companies[0].name}</span>
            </div>
          )}
        </div>

        {/* Main Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-primary rounded-tl-2xl rounded-br-2xl mb-4">
            <Upload className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-neutral-900 mb-3">
            העלאת שיחה
          </h1>
          
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            העלה שיחה וקבל ניתוח מפורט עם תובנות מעשיות לשיפור הביצועים
          </p>
          
          {/* Quick Stats */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Clock className="w-4 h-4 text-brand-primary" />
              <span>2-5 דקות עיבוד</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Target className="w-4 h-4 text-brand-secondary" />
              <span>ניתוח מדויק</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>המלצות מעשיות</span>
            </div>
          </div>
        </div>

        {/* Upload Form Section */}
        <div className="bg-white border border-neutral-200 rounded-tl-2xl rounded-br-2xl rounded-tr-lg rounded-bl-lg shadow-sm overflow-hidden">
          <div className="h-1 bg-brand-primary"></div>
          <div className="p-6">
            <UploadForm 
              user={user}
              userData={userData}
              callTypes={callTypes}
            />
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-4 bg-neutral-800 text-white rounded-xl px-6 py-3 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-brand-primary rounded-full"></span>
              איכות שמע ברורה
            </span>
            <span className="w-px h-4 bg-neutral-600"></span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-brand-secondary rounded-full"></span>
              בחירת סוג שיחה מדויק
            </span>
            <span className="w-px h-4 bg-neutral-600"></span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              ניתוח תוך דקות
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
