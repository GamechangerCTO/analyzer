import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import UploadForm from '@/components/UploadForm'
import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'

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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 relative overflow-hidden">
      {/* אלמנטים דקורטיביים ברקע */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-emerald-400/20 to-teal-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-cyan-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-gradient-to-r from-teal-400/15 to-emerald-600/15 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-gradient-to-l from-cyan-400/15 to-teal-600/15 rounded-full blur-3xl animate-pulse delay-300"></div>
      </div>
      
      <div className="relative z-10 py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          
          {/* כרטיס ראשי מעודכן */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden transition-all duration-500 hover:shadow-3xl hover:scale-[1.001]">
            
            {/* כותרת מעוצבת */}
            <div className="relative bg-gradient-to-r from-emerald-900 via-teal-900 to-cyan-900 text-white overflow-hidden">
              {/* דקורציה ברקע */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600"></div>
              
              <div className="relative z-10 p-8">
                {/* breadcrumb משופר */}
                <nav className="flex items-center mb-6 text-teal-200 text-sm" aria-label="Breadcrumb">
                  <Link 
                    href="/dashboard" 
                    className="flex items-center group hover:text-white transition-all duration-200 hover:bg-white/10 px-3 py-1 rounded-lg"
                  >
                    <svg className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                    <span>דשבורד</span>
                  </Link>
                  <svg className="w-4 h-4 mx-2 text-teal-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white font-medium">העלאת שיחה</span>
                </nav>
                
                {/* כותרת עם איקון מעוצב */}
                <div className="flex items-center">
                  <div className="relative">
                    <div className="bg-gradient-to-br from-emerald-400 to-cyan-600 p-4 rounded-2xl shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white animate-pulse"></div>
                  </div>
                  <div className="mr-6">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent mb-2">
                      העלאת שיחה חדשה
                    </h1>
                    <p className="text-teal-200 text-lg font-medium">
                      העלה ונתח שיחות עם בינה מלאכותית מתקדמת
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* תוכן הטופס */}
            <div className="p-8">
              <div className="animate-fade-in-up">
                {/* כרטיס הטופס עם עיצוב משופר */}
                <div className="bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-8 transition-all duration-300 hover:shadow-xl">
                  {/* אזור מידע נוסף */}
                  <div className="mb-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-r-4 border-emerald-400">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="bg-emerald-100 rounded-full p-3">
                          <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="mr-4">
                        <h3 className="text-lg font-semibold text-emerald-800 mb-2">הוראות העלאה</h3>
                        <ul className="text-emerald-700 space-y-1 text-sm leading-relaxed">
                          <li>• בחר קובץ אודיו באיכות טובה (MP3, WAV, M4A, WMA וכו')</li>
                          <li>• ודא שהשיחה ברורה וללא רעש רקע מוגזם</li>
                          <li>• בחר את סוג השיחה המתאים לניתוח מדויק</li>
                          <li>• הוסף פרטים נוספים לשיפור הניתוח</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* הטופס עצמו */}
                  <UploadForm 
                    user={user}
                    userData={userData}
                    callTypes={callTypes}
                  />
                </div>
              </div>
              
              {/* כרטיסי מידע נוספים */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in delay-200">
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-100 rounded-full p-2 mr-3">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-800">ניתוח מדויק</h4>
                  </div>
                  <p className="text-gray-600 text-sm">בינה מלאכותית מתקדמת לניתוח שיחות עם דיוק גבוה</p>
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <div className="flex items-center mb-4">
                    <div className="bg-green-100 rounded-full p-2 mr-3">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-800">עיבוד מהיר</h4>
                  </div>
                  <p className="text-gray-600 text-sm">תוצאות ניתוח מוכנות תוך דקות ספורות</p>
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <div className="flex items-center mb-4">
                    <div className="bg-purple-100 rounded-full p-2 mr-3">
                      <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-800">דוחות מפורטים</h4>
                  </div>
                  <p className="text-gray-600 text-sm">תובנות עמוקות ותחזיות לשיפור הביצועים</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 