'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

interface CompanyDetailsClientProps {
  userId: string
  companyId: string
  userRole: string
}

interface CompanyData {
  id: string
  name: string | null
  product_info: string | null
  created_at: string
  updated_at?: string
}

interface QuestionnaireData {
  id: string
  is_complete: boolean | null
  completion_score: number | null
  created_at: string
  updated_at?: string
}

interface CompanyStats {
  totalAgents: number
  totalCalls: number
  avgScore: number
  lastCallDate: string | null
}

export default function CompanyDetailsClient({ userId, companyId, userRole }: CompanyDetailsClientProps) {
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null)
  const [stats, setStats] = useState<CompanyStats>({
    totalAgents: 0,
    totalCalls: 0,
    avgScore: 0,
    lastCallDate: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = getSupabaseClient()

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        // שליפת פרטי החברה
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single()

        if (companyError) throw new Error(companyError.message)
        setCompany(companyData)

        // שליפת נתוני השאלון
        const { data: questionnaireData, error: questionnaireError } = await supabase
          .from('company_questionnaires')
          .select('*')
          .eq('company_id', companyId)
          .single()

        if (questionnaireError && questionnaireError.code !== 'PGRST116') {
          console.error('שגיאה בטעינת השאלון:', questionnaireError)
        } else if (questionnaireData) {
          setQuestionnaire(questionnaireData)
        }

        // שליפת סטטיסטיקות החברה
        const { data: agents, error: agentsError } = await supabase
          .from('users')
          .select('id')
          .eq('company_id', companyId)
          .eq('role', 'agent')

        if (agentsError) throw new Error(agentsError.message)

        const agentIds = agents?.map(agent => agent.id) || []
        let callsData: any[] = []
        let avgScore = 0

        if (agentIds.length > 0) {
          const { data: calls, error: callsError } = await supabase
            .from('calls')
            .select('overall_score, created_at')
            .in('user_id', agentIds)
            .order('created_at', { ascending: false })

          if (callsError) throw new Error(callsError.message)
          callsData = calls || []

          const callsWithScore = callsData.filter(call => call.overall_score !== null)
          avgScore = callsWithScore.length > 0
            ? callsWithScore.reduce((sum, call) => sum + (call.overall_score || 0), 0) / callsWithScore.length
            : 0
        }

        setStats({
          totalAgents: agents?.length || 0,
          totalCalls: callsData.length,
          avgScore,
          lastCallDate: callsData.length > 0 ? callsData[0].created_at : null
        })

      } catch (err) {
        console.error('שגיאה בטעינת פרטי החברה:', err)
        setError('שגיאה בטעינת פרטי החברה')
      } finally {
        setLoading(false)
      }
    }

    fetchCompanyDetails()
  }, [companyId, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">טוען פרטי החברה...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 text-red-700 p-4 rounded-md">
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* כותרת */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">פרטי החברה</h1>
              <p className="mt-2 text-gray-600">מידע מפורט על החברה והגדרותיה</p>
            </div>
            <Link 
              href="/dashboard/manager" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              חזרה לדשבורד
            </Link>
          </div>
        </div>

        {/* פרטי החברה הבסיסיים */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 014 0v2H6v-2z" clipRule="evenodd" />
            </svg>
            מידע בסיסי
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">שם החברה</label>
              <div className="p-3 bg-gray-50 rounded-md border">
                <p className="text-lg font-semibold text-gray-900">{company?.name || 'לא הוגדר'}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">תאריך הצטרפות</label>
              <div className="p-3 bg-gray-50 rounded-md border">
                <p className="text-lg text-gray-900">
                  {company?.created_at ? format(new Date(company.created_at), 'dd/MM/yyyy', { locale: he }) : 'לא ידוע'}
                </p>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">תיאור המוצר/שירות</label>
              <div className="p-3 bg-gray-50 rounded-md border min-h-[80px]">
                <p className="text-gray-900">{company?.product_info || 'לא הוגדר'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* סטטיסטיקות החברה */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            סטטיסטיקות
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">נציגים פעילים</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.totalAgents}</p>
                </div>
                <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">סה"כ שיחות</p>
                  <p className="text-2xl font-bold text-green-700">{stats.totalCalls}</p>
                </div>
                <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-900">ציון ממוצע</p>
                  <p className="text-2xl font-bold text-purple-700">{stats.avgScore.toFixed(1)}</p>
                </div>
                <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-900">שיחה אחרונה</p>
                  <p className="text-sm font-bold text-orange-700">
                    {stats.lastCallDate 
                      ? format(new Date(stats.lastCallDate), 'dd/MM/yyyy', { locale: he })
                      : 'אין נתונים'
                    }
                  </p>
                </div>
                <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* מצב השאלון */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
            שאלון החברה
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">סטטוס השאלון</h3>
                
                {questionnaire ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {questionnaire.is_complete ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          ✅ הושלם
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                          ⏳ לא הושלם
                        </span>
                      )}
                    </div>
                    
                    {questionnaire.completion_score && (
                      <div>
                        <p className="text-sm text-gray-600">ציון השלמה: 
                          <span className="font-semibold text-gray-900 mr-1">
                            {questionnaire.completion_score}%
                          </span>
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm text-gray-600">עודכן לאחרונה: 
                        <span className="font-semibold text-gray-900 mr-1">
                          {format(new Date(questionnaire.updated_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                        </span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      ❌ לא נמצא שאלון
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">פעולות שאלון</h3>
                
                <div className="space-y-3">
                  <Link 
                    href="/company-questionnaire"
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-center font-medium transition-colors duration-200"
                  >
                    {questionnaire?.is_complete ? '📝 ערוך שאלון' : '📋 השלם שאלון'}
                  </Link>
                  
                  {questionnaire && (
                    <Link 
                      href="/company-questionnaire?view=true"
                      className="block w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg text-center font-medium transition-colors duration-200"
                    >
                      👁️ צפה בשאלון
                    </Link>
                  )}
                </div>
                
                <div className="mt-4 p-3 bg-blue-100 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>חשוב:</strong> השאלון מסייע למערכת לספק ניתוח מותאם לצרכי החברה שלכם
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* פעולות מהירות */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            פעולות מהירות
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/dashboard/manager/all-calls"
              className="p-4 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-gray-900">כל השיחות</h3>
                  <p className="text-sm text-gray-600">צפייה וניתוח שיחות</p>
                </div>
              </div>
            </Link>
            
            <Link 
              href="/team"
              className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-gray-900">ניהול הצוות</h3>
                  <p className="text-sm text-gray-600">צפייה בנציגים</p>
                </div>
              </div>
            </Link>
            
            <Link 
              href="/upload"
              className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-semibold text-gray-900">העלאת שיחה</h3>
                  <p className="text-sm text-gray-600">העלאה וניתוח</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 