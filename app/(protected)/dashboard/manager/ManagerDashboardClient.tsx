'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import DateRangePicker from '@/components/DateRangePicker'
import CallsBarChart from '@/components/CallsBarChart'
import ProgressLineChart from '@/components/ProgressLineChart'
import Link from 'next/link'
import { format } from 'date-fns'

// טיפוסים
interface Call {
  id: string
  call_type: string
  created_at: string
  overall_score: number | null
  red_flag: boolean | null
  processing_status: string
  audio_duration_seconds: number | null
  user_id: string
}

interface User {
  id: string
  full_name: string | null
  email: string
  callsCount: number
  avgScore: number
  redFlagsCount: number
  successfulCallsCount: number
  callsByType: {
    [key: string]: number
  }
  simulationsCount: number
  improvedSimulationsCount: number
  callsToImproveCount: number
  avgDuration: number
}

interface TeamSummary {
  totalAgents: number
  totalCalls: number
  avgScore: number
  redFlagsCount: number
  successfulCallsCount: number
}

interface ManagerDashboardClientProps {
  userId: string
  companyId: string | null
}

export default function ManagerDashboardClient({ userId, companyId }: ManagerDashboardClientProps) {
  const [calls, setCalls] = useState<Call[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [managerInfo, setManagerInfo] = useState<{
    full_name: string | null
    email: string
    role: string
  } | null>(null)
  const [companyInfo, setCompanyInfo] = useState<{
    name: string | null
    product_info: string | null
  } | null>(null)
  const [isQuestionnaireComplete, setIsQuestionnaireComplete] = useState<boolean>(true)
  const [isCheckingQuestionnaire, setIsCheckingQuestionnaire] = useState<boolean>(true)
  const [startDate, setStartDate] = useState<Date>(() => {
    const today = new Date()
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())
    return sixMonthsAgo
  })
  const [endDate, setEndDate] = useState<Date>(() => {
    const today = new Date()
    return today
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false) // למניעת קריאות כפולות
  const [teamSummary, setTeamSummary] = useState<TeamSummary>({
    totalAgents: 0,
    totalCalls: 0,
    avgScore: 0,
    redFlagsCount: 0,
    successfulCallsCount: 0
  })
  const [progressData, setProgressData] = useState({
    labels: [] as string[],
    datasets: [
      {
        label: 'ציון ממוצע צוותי',
        data: [] as number[]
      }
    ]
  })
  
  const supabase = createClientComponentClient()
  const isFirstRender = useRef(true)
  const lastFetchParamsRef = useRef<string>('')
  
  // עדכון טווח התאריכים
  const handleDateRangeChange = useCallback((start: Date, end: Date) => {
    setStartDate(start)
    setEndDate(end)
  }, [])
  
  // פונקציה לבדיקת שלמות השאלון
  const checkQuestionnaireComplete = useCallback(async () => {
    if (!companyId) return
    
    setIsCheckingQuestionnaire(true)
    try {
      const { data: companyData, error } = await supabase
        .from('companies')
        .select('product_info, sector, avg_product_cost, product_types, audience, differentiators, customer_benefits, company_benefits')
        .eq('id', companyId)
        .single()
      
      if (error) {
        console.error('❌ Error checking questionnaire:', error)
        setIsQuestionnaireComplete(false)
        return
      }
      
      // בדיקה אם השאלון מלא
      const isComplete = companyData && 
        companyData.product_info && 
        companyData.sector && 
        companyData.avg_product_cost && 
        companyData.product_types && Array.isArray(companyData.product_types) && companyData.product_types.length > 0 &&
        companyData.audience &&
        companyData.differentiators && Array.isArray(companyData.differentiators) && companyData.differentiators.length > 0 &&
        companyData.customer_benefits && Array.isArray(companyData.customer_benefits) && companyData.customer_benefits.length > 0 &&
        companyData.company_benefits && Array.isArray(companyData.company_benefits) && companyData.company_benefits.length > 0
      
      setIsQuestionnaireComplete(isComplete)
    } catch (error) {
      console.error('❌ Unexpected error checking questionnaire:', error)
      setIsQuestionnaireComplete(false)
    } finally {
      setIsCheckingQuestionnaire(false)
    }
  }, [companyId, supabase])
  
  // פונקציה לטיפול בנתונים עם useMemo למניעת יצירה מחדש
  const dateKey = useMemo(() => {
    return `${companyId}-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
  }, [companyId, startDate, endDate]);
  
  // עיבוד נתוני הנציגים
  const processAgentsData = useCallback((agentsData: any[], callsData: Call[]) => {
    console.log('🔍 Processing:', agentsData.length, 'agents,', callsData.length, 'calls');
    const processedUsers: User[] = agentsData.map(agent => {
      // סינון השיחות של הנציג הנוכחי
      const agentCalls = callsData.filter(call => call.user_id === agent.id)
      
      // חישוב מספר שיחות לפי סוג
      const callsByType: {[key: string]: number} = {}
      
      agentCalls.forEach(call => {
        callsByType[call.call_type] = (callsByType[call.call_type] || 0) + 1
      })
      
      // חישוב מדדים נוספים
      const callsWithScore = agentCalls.filter(call => call.overall_score !== null)
      const avgScore = callsWithScore.length > 0 
        ? callsWithScore.reduce((sum, call) => sum + (call.overall_score || 0), 0) / callsWithScore.length
        : 0
      
      const redFlagsCount = agentCalls.filter(call => call.red_flag).length
      const successfulCallsCount = callsWithScore.filter(call => (call.overall_score || 0) >= 8).length
      const callsToImproveCount = callsWithScore.filter(call => (call.overall_score || 0) < 6).length
      
      const callsWithDuration = agentCalls.filter(call => call.audio_duration_seconds !== null)
      const avgDuration = callsWithDuration.length > 0
        ? callsWithDuration.reduce((sum, call) => sum + (call.audio_duration_seconds || 0), 0) / callsWithDuration.length
        : 0
      
      // סימולציות (מיוצג כאן באופן אקראי - יש להחליף עם המודל האמיתי)
      const simulationsCount = Math.floor(agentCalls.length * 0.3)
      const improvedSimulationsCount = Math.floor(simulationsCount * 0.7)
      
      return {
        id: agent.id,
        full_name: agent.full_name || 'ללא שם',
        email: agent.email,
        callsCount: agentCalls.length,
        avgScore,
        redFlagsCount,
        successfulCallsCount,
        callsByType,
        simulationsCount,
        improvedSimulationsCount,
        callsToImproveCount,
        avgDuration
      }
    })
    
    // מיון הנציגים לפי מספר שיחות (מהגבוה לנמוך)
    processedUsers.sort((a, b) => b.callsCount - a.callsCount)
    
    setUsers(processedUsers)
  }, [setUsers])
  
  // עיבוד סיכום הצוות
  const processTeamSummary = useCallback((agentsData: any[], callsData: Call[]) => {
    const callsWithScore = callsData.filter(call => call.overall_score !== null)
    
    const summary: TeamSummary = {
      totalAgents: agentsData.length,
      totalCalls: callsData.length,
      avgScore: callsWithScore.length > 0 
        ? callsWithScore.reduce((sum, call) => sum + (call.overall_score || 0), 0) / callsWithScore.length
        : 0,
      redFlagsCount: callsData.filter(call => call.red_flag).length,
      successfulCallsCount: callsWithScore.filter(call => (call.overall_score || 0) >= 8).length
    }
    
    setTeamSummary(summary)
  }, [setTeamSummary])
  
  // יצירת נתוני גרף התקדמות
  const generateProgressData = useCallback((callsData: Call[]) => {
    // מיון השיחות לפי תאריך
    const sortedCalls = [...callsData].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    
    // קיבוץ לפי תאריכים
    const groupedByDate: {[key: string]: Call[]} = {}
    
    sortedCalls.forEach(call => {
      const dateKey = format(new Date(call.created_at), 'yyyy-MM-dd')
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = []
      }
      groupedByDate[dateKey].push(call)
    })
    
    // יצירת מערכי נתונים לגרף
    const labels: string[] = []
    const avgScores: number[] = []
    
    Object.entries(groupedByDate).forEach(([dateKey, calls]) => {
      const callsWithScore = calls.filter(call => call.overall_score !== null)
      
      if (callsWithScore.length > 0) {
        const avgScore = callsWithScore.reduce((sum, call) => sum + (call.overall_score || 0), 0) / callsWithScore.length
        
        labels.push(format(new Date(dateKey), 'dd/MM'))
        avgScores.push(Number(avgScore.toFixed(1)))
      }
    })
    
    // שימוש רק ב-10 הנקודות האחרונות אם יש יותר מדי
    const maxPoints = 10
    const sliceStart = Math.max(0, labels.length - maxPoints)
    
    setProgressData({
      labels: labels.slice(sliceStart),
      datasets: [
        {
          label: 'ציון ממוצע יומי',
          data: avgScores.slice(sliceStart)
        }
      ]
    })
  }, [setProgressData])
  
  // קבלת נתוני השיחות והמשתמשים בטווח התאריכים
  useEffect(() => {
    if (!companyId) {
      console.log('⚠️ No companyId provided, skipping data fetch');
      return;
    }

    // בדיקת השאלון
    checkQuestionnaireComplete()

    // בדיקה אם כבר מבצעים קריאה זהה
    if (isFetching || lastFetchParamsRef.current === dateKey) {
      console.log('⚠️ Already fetching data or same params, skipping...', { isFetching, lastKey: lastFetchParamsRef.current, currentKey: dateKey });
      return;
    }

    const fetchData = async () => {
      try {
        setIsFetching(true);
        setIsLoading(true);
        lastFetchParamsRef.current = dateKey;
        console.log('🔄 Starting data fetch for company:', companyId, 'Key:', dateKey);

        // קבלת פרטי המנהל
        const { data: managerData, error: managerError } = await supabase
          .from('users')
          .select('full_name, email, role')
          .eq('id', userId)
          .single();

        if (managerError) {
          console.error('❌ Manager data error:', managerError);
        } else if (managerData) {
          setManagerInfo(managerData);
        }

        // קבלת פרטי החברה
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('name, product_info')
          .eq('id', companyId)
          .single();

        if (companyError) {
          console.error('❌ Company data error:', companyError);
        } else if (companyData) {
          setCompanyInfo(companyData);
        }

        const startDateStr = format(startDate, 'yyyy-MM-dd');
        const endDateStr = format(new Date(endDate.setHours(23, 59, 59)), 'yyyy-MM-dd HH:mm:ss');

        // קבלת כל השיחות של החברה בטווח התאריכים
        const { data: callsData, error: callsError } = await supabase
          .from('calls')
          .select('*')
          .eq('company_id', companyId)
          .gte('created_at', startDateStr)
          .lte('created_at', endDateStr)
          .order('created_at', { ascending: false });

        if (callsError) {
          console.error('❌ Error fetching calls:', callsError);
          setIsLoading(false);
          setIsFetching(false);
          return;
        }

        // קבלת הנציגים באותה חברה
        const { data: agentsData, error: agentsError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('company_id', companyId)
          .in('role', ['agent']);

        if (agentsError) {
          console.error('❌ Error fetching agents:', agentsError);
          setIsLoading(false);
          setIsFetching(false);
          return;
        }

        console.log('✅ Data fetch completed. Calls:', callsData?.length || 0, 'Agents:', agentsData?.length || 0);
        
        setCalls(callsData || []);
        
        // הפקת מידע סטטיסטי על כל נציג
        processAgentsData(agentsData || [], callsData || []);
        
        // חישוב סיכום צוותי
        processTeamSummary(agentsData || [], callsData || []);
        
        // יצירת גרף התקדמות
        generateProgressData(callsData || []);
        
        setIsLoading(false);
        setIsFetching(false);
      } catch (error) {
        console.error('💥 Unexpected error in fetchData:', error);
        setIsLoading(false);
        setIsFetching(false);
      }
    };

    // ביצוע מיידי ללא עיכוב
    fetchData();
  }, [dateKey, userId, companyId, processAgentsData, processTeamSummary, generateProgressData, checkQuestionnaireComplete])
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* כותרת עליונה עם פרטי המנהל והחברה */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold mb-2">דשבורד מנהל</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold">{managerInfo?.full_name || 'לא זמין'}</p>
                    <p className="text-blue-100 text-sm">{managerInfo?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 014 0v2H6v-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold">{companyInfo?.name || 'שם החברה'}</p>
                    <p className="text-blue-100 text-sm">{companyInfo?.product_info || 'תיאור החברה'}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm">תאריך עדכון אחרון</p>
              <p className="font-semibold">{format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {/* בחירת טווח תאריכים */}
        <div className="mb-6">
          <DateRangePicker 
            onDateRangeChange={handleDateRangeChange} 
            initialStartDate={startDate}
            initialEndDate={endDate}
          />
        </div>

        {/* הודעה על שאלון חסר */}
        {!isCheckingQuestionnaire && !isQuestionnaireComplete && (
          <div className="bg-gradient-to-r from-orange-400 to-red-500 border border-orange-300 text-white p-6 rounded-xl shadow-lg mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-grow">
                <h3 className="text-xl font-bold mb-2">⚠️ שאלון החברה טרם הושלם</h3>
                <p className="text-lg mb-4">
                  כדי שהמערכת תוכל לספק ניתוח מדויק ומותאם לצרכי החברה שלכם, חובה להשלים את שאלון החברה. 
                  ללא מילוי השאלון, הנציגים לא יוכלו להעלות שיחות לניתוח.
                  <br /><br />
                  <strong>יש לפנות למנהל המערכת כדי להשלים את השאלון.</strong>
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="mailto:ido.segev23@gmail.com?subject=השלמת שאלון חברה&body=שלום, אנא עזרו לי להשלים את שאלון החברה במערכת."
                    className="bg-white text-orange-600 px-6 py-3 rounded-lg font-bold hover:bg-orange-50 transition-colors border-2 border-white text-center"
                  >
                    📧 פנה למנהל המערכת
                  </a>
                  <button
                    onClick={() => checkQuestionnaireComplete()}
                    className="bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-bold hover:bg-white hover:text-orange-600 transition-colors"
                  >
                    🔄 בדוק שוב
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* סיכום צוותי */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            סיכום צוותי
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">סה"כ נציגים</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">{teamSummary.totalAgents}</p>
                </div>
                <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">סה"כ שיחות</p>
                  <p className="text-3xl font-bold text-green-700 mt-1">{teamSummary.totalCalls}</p>
                </div>
                <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-900">ציון ממוצע</p>
                  <p className="text-3xl font-bold text-purple-700 mt-1">{teamSummary.avgScore.toFixed(1)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-900">דגלים אדומים</p>
                  <p className="text-3xl font-bold text-red-700 mt-1">{teamSummary.redFlagsCount}</p>
                </div>
                <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-xl border border-teal-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-teal-900">שיחות מוצלחות</p>
                  <p className="text-3xl font-bold text-teal-700 mt-1">{teamSummary.successfulCallsCount}</p>
                </div>
                <div className="w-12 h-12 bg-teal-200 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* גרף התקדמות */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            מגמת הציון הצוותי
          </h2>
          <ProgressLineChart data={progressData} title="ציון ממוצע לאורך זמן" height={300} />
        </div>

        {/* טבלת נציגים */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
            </svg>
            פירוט ביצועי נציגים
          </h2>
          
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                    נציג
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                    כלל שיחות
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                    מכירה טלפונית
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                    פולו אפ לפני הצעה
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                    פולו אפ לאחר הצעה
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                    תאום פגישה
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                    מכירה חוזרת/שדרוג
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                    שירות
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                    ציון ממוצע
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                    דגלים אדומים
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                    שיחות מוצלחות
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                    זמן שיחה ממוצע
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                    שיחות לשיפור
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                    סימולציות שבוצעו
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                    סימולציות שהשתפרו
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {users.map((user, index) => (
                  <tr key={user.id} 
                      className={`cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-md ${
                        index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                      }`}
                      onClick={() => window.location.href = `/dashboard/agent?user=${user.id}`}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                          {user.full_name?.charAt(0) || 'א'}
                        </div>
                        <Link href={`/dashboard/agent?user=${user.id}`} 
                              className="text-blue-600 hover:text-blue-900 font-semibold hover:underline"
                              onClick={(e) => e.stopPropagation()}>
                          {user.full_name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-bold">
                        {user.callsCount}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap font-semibold">
                      {user.callsByType['מכירה טלפונית'] || 0}
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap font-semibold">
                      {user.callsByType['פולו אפ מכירה טלפונית לפניי הצעה'] || 0}
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap font-semibold">
                      {user.callsByType['פולו אפ מכירה טלפונית –לאחר הצעה'] || 0}
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap font-semibold">
                      {user.callsByType['תאום פגישה'] || 0}
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap font-semibold">
                      {user.callsByType['מכירה טלפונית חוזרת /שדרוג'] || 0}
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap font-semibold">
                      {user.callsByType['שירות'] || 0}
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap">
                      <span 
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          user.avgScore >= 8 
                            ? 'bg-green-100 text-green-800' 
                            : user.avgScore >= 6
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.avgScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap">
                      {user.redFlagsCount > 0 ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full font-bold text-sm">
                          {user.redFlagsCount}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-semibold">{user.redFlagsCount}</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full font-bold text-sm">
                        {user.successfulCallsCount}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap font-semibold text-gray-700">
                      {Math.floor(user.avgDuration / 60)}:{(Math.floor(user.avgDuration % 60)).toString().padStart(2, '0')}
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap">
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full font-bold text-sm">
                        {user.callsToImproveCount}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap font-semibold text-gray-700">
                      {user.simulationsCount}
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full font-bold text-sm">
                        {user.improvedSimulationsCount}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={15} className="px-4 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-300 mb-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zM8 6a2 2 0 114 0v1H8V6z" clipRule="evenodd" />
                        </svg>
                        <p className="text-lg font-medium">לא נמצאו נציגים</p>
                        <p className="text-sm">נסה לשנות את טווח התאריכים</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* גרף השוואה בין נציגים */}
        {users.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
              ביצועי נציגים - השוואה
            </h2>
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg">
              <CallsBarChart 
                data={{
                  labels: users.map(user => user.full_name || 'ללא שם'),
                  values: users.map(user => user.avgScore)
                }} 
                title="ציון ממוצע לנציג" 
                height={300} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 