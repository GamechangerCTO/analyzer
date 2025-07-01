'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CallAnalysis from '@/components/CallAnalysis'
import { CallData } from '@/types/calldata.types'
import Link from 'next/link'

interface CallPageProps {
  params: {
    id: string
  }
}

export default function CallPage({ params }: CallPageProps) {
  const supabase = createClient()
  const [call, setCall] = useState<CallData | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCallData = async () => {
      if (!params.id) {
        setError('מזהה שיחה לא סופק')
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // 1. קבל את נתוני השיחה מטבלת 'calls'
        const { data: callData, error: callError } = await supabase
          .from('calls')
          .select(`
            *,
            users:user_id (id, full_name, email),
            companies:company_id (id, name)
          `)
          .eq('id', params.id)
          .single()

        if (callError) {
          console.error('Error fetching call:', callError)
          throw new Error('שגיאה בטעינת נתוני השיחה: ' + callError.message)
        }

        if (!callData) {
          throw new Error('השיחה לא נמצאה.')
        }
        
        // Debug
        console.log('Call data from supabase:', callData);
        console.log('analysis_report type:', typeof callData.analysis_report);
        if (callData.analysis_report) {
          console.log('analysis_report keys:', Object.keys(callData.analysis_report));
        }
        
        setCall(callData as CallData)

        // 2. קבל את ה-URL החתום לקובץ האודיו
        if (callData.audio_file_path) {
          const { data: urlData, error: urlError } = await supabase.storage
            .from('audio_files')
            .createSignedUrl(callData.audio_file_path, 60 * 60) // URL תקף לשעה

          if (urlError) {
            console.error('Error creating signed URL:', urlError)
            // אפשר להמשיך להציג את הניתוח גם אם אין אודיו זמין
            setAudioUrl(null)
          } else {
            setAudioUrl(urlData.signedUrl)
          }
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'שגיאה לא ידועה בטעינת השיחה')
      } finally {
        setLoading(false)
      }
    }

    fetchCallData()
  }, [params.id, supabase])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* אלמנטים דקורטיביים ברקע */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      
      <div className="relative z-10 py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          
          {/* כרטיס ראשי מעודכן */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden transition-all duration-500 hover:shadow-3xl hover:scale-[1.001]">
            
            {/* שורת ניווט והכותרת משופרת */}
            <div className="relative bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
              {/* דקורציה ברקע */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600"></div>
              
              <div className="relative z-10 p-8">
                {/* breadcrumb משופר */}
                <nav className="flex items-center mb-6 text-blue-200 text-sm" aria-label="Breadcrumb">
                  <Link 
                    href="/dashboard" 
                    className="flex items-center group hover:text-white transition-all duration-200 hover:bg-white/10 px-3 py-1 rounded-lg"
                  >
                    <svg className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                    <span>דשבורד</span>
                  </Link>
                  <svg className="w-4 h-4 mx-2 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white font-medium">ניתוח שיחה</span>
                </nav>
                
                {/* כותרת משופרת */}
                <div className="flex items-center">
                  <div className="relative">
                    <div className="bg-gradient-to-br from-blue-400 to-purple-600 p-4 rounded-2xl shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                  </div>
                  <div className="mr-6">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent mb-2">
                      ניתוח שיחה מתקדם
                    </h1>
                    <p className="text-blue-200 text-lg font-medium">
ניתוח מקצועי בהתאם לפרמטרים של החברה                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* תוכן הדף */}
            <div className="p-8">
              {loading && (
                <div className="flex flex-col justify-center items-center py-20">
                  {/* מחוון טעינה משופר */}
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-ping opacity-20"></div>
                    <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-full p-6">
                      <svg className="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </div>
                  
                  {/* טקסט טעינה מתחלף */}
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">טוען נתוני שיחה...</h3>
                    <div className="bg-gray-100 rounded-full h-2 w-80 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full animate-pulse w-full"></div>
                    </div>
                    <p className="text-gray-600 mt-4 font-medium">מבצע ניתוח מתקדם של תוכן השיחה</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="max-w-2xl mx-auto">
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 border-r-4 border-red-500 rounded-2xl p-8 shadow-lg animate-fade-in">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="bg-red-100 rounded-full p-3">
                          <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="mr-4 flex-1">
                        <h3 className="text-2xl font-bold text-red-800 mb-3">אירעה שגיאה</h3>
                        <p className="text-gray-700 text-lg leading-relaxed mb-6">{error}</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
                          >
                            נסה שנית
                          </button>
                          <button
                            onClick={() => window.location.href = '/dashboard'}
                            className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-full hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
                          >
                            חזור לדשבורד
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!loading && !error && call && (
                <div className="animate-fade-in-up">
                  <CallAnalysis call={call} audioUrl={audioUrl} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 

// הוספת אנימציות גלובליות
// יש להוסיף זאת ל-tailwind.config.js אם עדיין לא קיים
/**
 * @tailwind.config.js:
 * extend: {
 *   animation: {
 *     'fade-in': 'fadeIn 0.5s ease-in-out',
 *   },
 *   keyframes: {
 *     fadeIn: {
 *       '0%': { opacity: '0' },
 *       '100%': { opacity: '1' },
 *     },
 *   },
 * },
 */ 