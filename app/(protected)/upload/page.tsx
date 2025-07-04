import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import UploadForm from '@/components/UploadForm'
import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

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
    <div className="min-h-screen">
      {/* Header עם breadcrumb מינימליסטי */}
      <div className="choacee-card-clay-raised mb-8">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center space-x-2 text-sm text-neutral-500" aria-label="Breadcrumb">
              <Link 
                href="/dashboard" 
                className="flex items-center hover:text-clay-primary transition-colors duration-200 font-medium choacee-interactive"
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                דשבורד
              </Link>
              <svg className="w-4 h-4 text-neutral-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-clay-primary font-semibold">העלאת שיחה</span>
            </nav>
            
            {/* Company Info */}
            {userData?.companies?.name && (
              <div className="text-sm text-neutral-500">
                חברה: <span className="font-semibold text-clay-primary">{userData.companies.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Page Title */}
        <div className="text-center choacee-smooth-appear">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-clay-success/20 rounded-clay flex items-center justify-center animate-clay-float shadow-clay-soft">
              <svg className="w-10 h-10 text-clay-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          </div>
          <h1 className="choacee-text-display text-4xl font-bold text-clay-primary mb-4">
            העלה שיחה חדשה 🎯
          </h1>
          <p className="choacee-text-body text-lg text-neutral-600 max-w-3xl mx-auto leading-relaxed">
            העלה ונתח שיחות עם טכנולוגיות ניתוח מתקדמות לקבלת תובנות מעמיקות ומותאמות אישית
            <br />
            <span className="text-clay-success font-semibold">המערכת תכין עבורך דוח מפורט עם המלצות לשיפור</span>
          </p>
        </div>

        {/* Upload Form Component */}
        <div className="choacee-card-clay-raised p-8">
          <UploadForm 
            user={user}
            userData={userData}
            callTypes={callTypes}
          />
        </div>

        {/* Bottom Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="choacee-card-clay choacee-interactive border-r-4 border-clay-success">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-clay-success/20 rounded-clay flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-clay-success-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="choacee-text-display font-bold text-clay-primary">ניתוח מדויק</h3>
            </div>
            <p className="choacee-text-body text-neutral-600 leading-relaxed">
              אלגוריתמים מתקדמים לניתוח שיחות עם דיוק גבוה ותובנות מעמיקות על ביצועים מכירתיים
            </p>
          </div>

          <div className="choacee-card-clay choacee-interactive border-r-4 border-clay-danger">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-clay-danger/20 rounded-clay flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-clay-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="choacee-text-display font-bold text-clay-primary">עיבוד מהיר</h3>
            </div>
            <p className="choacee-text-body text-neutral-600 leading-relaxed">
              תוצאות ניתוח מוכנות תוך דקות ספורות עם דוחות מפורטים, מעשיים ומותאמים אישית
            </p>
          </div>

          <div className="choacee-card-clay choacee-interactive border-r-4 border-clay-primary">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-clay-primary/20 rounded-clay flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-clay-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="choacee-text-display font-bold text-clay-primary">תובנות מתקדמות</h3>
            </div>
            <p className="choacee-text-body text-neutral-600 leading-relaxed">
              המלצות מותאמות אישית לשיפור ביצועי המכירות והשירות עם דגש על נקודות מפתח
            </p>
          </div>
        </div>

        {/* הוספת קטע עזרה */}
        <div className="choacee-card-glass p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-clay-primary/10 rounded-clay flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-clay-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="choacee-text-display text-lg font-semibold text-clay-primary mb-2">💡 טיפים להעלאה מוצלחת</h3>
              <ul className="choacee-text-body text-neutral-600 space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-clay-success rounded-full"></span>
                  <span>וודא שאיכות הקול ברורה וללא רעשי רקע</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-clay-danger rounded-full"></span>
                  <span>בחר את סוג השיחה המדויק לקבלת ניתוח מותאם</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-clay-primary rounded-full"></span>
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