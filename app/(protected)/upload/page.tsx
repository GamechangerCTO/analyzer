import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import UploadForm from '@/components/UploadForm'
import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default async function UploadPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
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
    <div className="min-h-screen">
      {/* Header עם breadcrumb מינימליסטי */}
      <div className="replayme-card mb-8">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center space-x-2 text-sm text-indigo-night/60" aria-label="Breadcrumb">
              <Link 
                href="/dashboard" 
                className="flex items-center hover:text-lemon-mint-dark transition-colors duration-200 font-medium"
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                דשבורד
              </Link>
              <svg className="w-4 h-4 text-ice-gray" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-indigo-night font-semibold">העלאת שיחה</span>
            </nav>
            
            {/* Company Info */}
            {userData?.companies?.name && (
              <div className="text-sm text-indigo-night/60">
                חברה: <span className="font-semibold text-indigo-night">{userData.companies.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Page Title */}
        <div className="text-center smooth-appear">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-lemon-mint/20 rounded-2xl flex items-center justify-center animate-lemon-pulse">
              <svg className="w-10 h-10 text-lemon-mint-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          </div>
          <h1 className="text-display text-4xl font-bold text-indigo-night mb-4">
            העלה שיחה חדשה 🎯
          </h1>
          <p className="text-lg text-indigo-night/70 max-w-3xl mx-auto leading-relaxed">
            העלה ונתח שיחות עם בינה מלאכותית מתקדמת לקבלת תובנות מעמיקות ומותאמות אישית
            <br />
            <span className="text-lemon-mint-dark font-semibold">המערכת תכין עבורך דוח מפורט עם המלצות לשיפור</span>
          </p>
        </div>

        {/* Upload Form Component */}
        <div className="replayme-card p-8">
          <UploadForm 
            user={user}
            userData={userData}
            callTypes={callTypes}
          />
        </div>

        {/* Bottom Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="replayme-card p-6 card-hover border-r-4 border-lemon-mint">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-lemon-mint/20 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-lemon-mint-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-display font-bold text-indigo-night">ניתוח מדויק</h3>
            </div>
            <p className="text-indigo-night/70 leading-relaxed">
              בינה מלאכותית מתקדמת לניתוח שיחות עם דיוק גבוה ותובנות מעמיקות על ביצועים מכירתיים
            </p>
          </div>

          <div className="replayme-card p-6 card-hover border-r-4 border-electric-coral">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-electric-coral/20 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-electric-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-display font-bold text-indigo-night">עיבוד מהיר</h3>
            </div>
            <p className="text-indigo-night/70 leading-relaxed">
              תוצאות ניתוח מוכנות תוך דקות ספורות עם דוחות מפורטים, מעשיים ומותאמים אישית
            </p>
          </div>

          <div className="replayme-card p-6 card-hover border-r-4 border-indigo-night">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-indigo-night/20 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-indigo-night" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-display font-bold text-indigo-night">תובנות מתקדמות</h3>
            </div>
            <p className="text-indigo-night/70 leading-relaxed">
              המלצות מותאמות אישית לשיפור ביצועי המכירות והשירות עם דגש על נקודות מפתח
            </p>
          </div>
        </div>

        {/* הוספת קטע עזרה */}
        <div className="replayme-card-secondary p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-indigo-night/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-indigo-night" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-display text-lg font-semibold text-indigo-night mb-2">💡 טיפים להעלאה מוצלחת</h3>
              <ul className="text-indigo-night/70 space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-lemon-mint rounded-full"></span>
                  <span>וודא שאיכות הקול ברורה וללא רעשי רקע</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-electric-coral rounded-full"></span>
                  <span>בחר את סוג השיחה המדויק לקבלת ניתוח מותאם</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-indigo-night rounded-full"></span>
                  <span>תוכל לצפות בתוצאות תוך 2-5 דקות</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 