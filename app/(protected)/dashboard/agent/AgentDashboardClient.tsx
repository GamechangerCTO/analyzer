'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
// הסרת ייבוא של DateRangePicker שלא נדרש יותר
// import DateRangePicker from '@/components/DateRangePicker'
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
  processing_status: string | null
  audio_duration_seconds: number | null
  has_simulation?: boolean | null
  simulation_improved?: boolean | null
  tone_analysis_report?: any
  user_id?: string | null
}

interface CallTypeSummary {
  [key: string]: {
    totalCalls: number
    avgScore: number
    avgDuration: number
    successfulCalls: number
    needImprovementCalls: number
    simulationsCount: number
    improvedSimulationsCount: number
  }
}

interface AgentDashboardClientProps {
  userId: string
  companyId: string | null
}

type FilterType = 'all' | 'successful' | 'needImprovement'

export default function AgentDashboardClient({ userId, companyId }: AgentDashboardClientProps) {
  console.log('AgentDashboardClient rendered/re-rendered');
  const [calls, setCalls] = useState<Call[]>([])
  // הסרת שורות State של תאריכים
  const [isLoading, setIsLoading] = useState(true)
  const [summaryData, setSummaryData] = useState<CallTypeSummary>({})
  const [progressData, setProgressData] = useState({
    labels: [] as string[],
    datasets: [
      {
        label: 'ציון ממוצע',
        data: [] as number[]
      }
    ]
  })
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all')
  
  const supabase = useMemo(() => getSupabaseClient(), [])
  
  // הסרת לוגים ו-useMemo של שאילתות תאריכים

  // הסרת פונקציית handleDateRangeChange
  
  const processCallsData = useCallback((callsData: Call[]) => {
    const summary: CallTypeSummary = {
      'כלל שיחות': { totalCalls: 0, avgScore: 0, avgDuration: 0, successfulCalls: 0, needImprovementCalls: 0, simulationsCount: 0, improvedSimulationsCount: 0 },
      'מכירה טלפונית': { totalCalls: 0, avgScore: 0, avgDuration: 0, successfulCalls: 0, needImprovementCalls: 0, simulationsCount: 0, improvedSimulationsCount: 0 },
      'פולו אפ מכירה טלפונית – לאחר שיחה ראשונית לפניי הצעה': { totalCalls: 0, avgScore: 0, avgDuration: 0, successfulCalls: 0, needImprovementCalls: 0, simulationsCount: 0, improvedSimulationsCount: 0 },
      'שירות לקוחות': { totalCalls: 0, avgScore: 0, avgDuration: 0, successfulCalls: 0, needImprovementCalls: 0, simulationsCount: 0, improvedSimulationsCount: 0 }
    }
    
    callsData.forEach(call => {
      summary['כלל שיחות'].totalCalls++
      if (call.overall_score !== null && call.overall_score !== undefined) {
        summary['כלל שיחות'].avgScore += call.overall_score
        if (call.overall_score >= 8) summary['כלל שיחות'].successfulCalls++
        if (call.overall_score > 0 && call.overall_score < 7) summary['כלל שיחות'].needImprovementCalls++
      }
      if (call.audio_duration_seconds) summary['כלל שיחות'].avgDuration += call.audio_duration_seconds
      if (call.has_simulation) {
        summary['כלל שיחות'].simulationsCount++
        if (call.simulation_improved) summary['כלל שיחות'].improvedSimulationsCount++
      }
      
      const callType = call.call_type
      if (summary[callType]) {
        summary[callType].totalCalls++
        if (call.overall_score !== null && call.overall_score !== undefined) {
          summary[callType].avgScore += call.overall_score
          if (call.overall_score >= 8) summary[callType].successfulCalls++
          if (call.overall_score > 0 && call.overall_score < 7) summary[callType].needImprovementCalls++
        }
        if (call.audio_duration_seconds) summary[callType].avgDuration += call.audio_duration_seconds
        if (call.has_simulation) {
          summary[callType].simulationsCount++
          if (call.simulation_improved) summary[callType].improvedSimulationsCount++
        }
      } else {
        // אם סוג השיחה לא קיים, נוסיף אותו דינמית
        summary[callType] = { totalCalls: 1, avgScore: 0, avgDuration: 0, successfulCalls: 0, needImprovementCalls: 0, simulationsCount: 0, improvedSimulationsCount: 0 }
        if (call.overall_score !== null && call.overall_score !== undefined) {
          summary[callType].avgScore += call.overall_score
          if (call.overall_score >= 8) summary[callType].successfulCalls++
          if (call.overall_score > 0 && call.overall_score < 7) summary[callType].needImprovementCalls++
        }
        if (call.audio_duration_seconds) summary[callType].avgDuration += call.audio_duration_seconds
        if (call.has_simulation) {
          summary[callType].simulationsCount++
          if (call.simulation_improved) summary[callType].improvedSimulationsCount++
        }
      }
    })
    
    Object.keys(summary).forEach(key => {
      const category = summary[key]
      const callsWithScore = callsData.filter(c => (key === 'כלל שיחות' || c.call_type === key) && c.overall_score !== null && c.overall_score !== undefined).length
      const callsWithDuration = callsData.filter(c => (key === 'כלל שיחות' || c.call_type === key) && c.audio_duration_seconds).length
      category.avgScore = callsWithScore > 0 ? category.avgScore / callsWithScore : 0
      category.avgDuration = callsWithDuration > 0 ? category.avgDuration / callsWithDuration : 0
    })
    
    setSummaryData(summary)
  }, [])
  
  const generateProgressData = useCallback((callsData: Call[]) => {
    const sortedCalls = [...callsData].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const timeLabels: string[] = []
    const avgScores: number[] = []
    const groupSize = 5
    
    for (let i = 0; i < sortedCalls.length; i += groupSize) {
      const group = sortedCalls.slice(i, i + groupSize)
      const callsWithScore = group.filter(call => call.overall_score !== null && call.overall_score !== undefined)
      if (callsWithScore.length > 0) {
        const avgScore = callsWithScore.reduce((sum, call) => sum + (call.overall_score || 0), 0) / callsWithScore.length
        avgScores.push(Number(avgScore.toFixed(1)))
        const lastDate = new Date(group[group.length - 1].created_at)
        timeLabels.push(format(lastDate, 'dd/MM/yyyy'))
      }
    }
    
    setProgressData({ labels: timeLabels, datasets: [{ label: 'ציון ממוצע', data: avgScores }] })
  }, [])

  const fetchCallsLogic = useCallback(async (isMountedCheck: () => boolean) => {
    console.log('fetchCallsLogic CALLED');
    if (!userId) {
      setCalls([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      console.log('Querying all calls for user:', userId);

      const { data, error } = await supabase
        .from('calls')
        .select('*, tone_analysis_report')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!isMountedCheck()) return

      if (error) {
        console.error('Error fetching calls:', error)
        setCalls([])
      } else {
        setCalls(data as Call[]);
        processCallsData(data as Call[]);
        generateProgressData(data as Call[]);
      }
    } catch (err) {
      if (!isMountedCheck()) return
      console.error('Unexpected error fetching calls:', err)
      setCalls([])
    } finally {
      if (isMountedCheck()) {
        setIsLoading(false)
      }
    }
  }, [userId, supabase, processCallsData, generateProgressData])
  
  console.log('fetchCallsLogic CREATED/RECREATED');

  useEffect(() => {
    console.log('useEffect for fetchCallsLogic RUNNING');
    let isMounted = true
    const isMountedCheck = () => isMounted
    
    fetchCallsLogic(isMountedCheck)
    
    return () => {
      isMounted = false
    }
  }, [fetchCallsLogic])
  
  const getChartData = useCallback(() => {
    if (Object.keys(summaryData).length === 0) return { labels: [], values: [] }
    const types = Object.keys(summaryData).filter(key => key !== 'כלל שיחות')
    
    // קיצור שמות סוגי השיחות לתצוגה בגרף
    const shortLabels = types.map(type => {
      switch (type) {
        case 'פולו אפ מכירה טלפונית – לאחר שיחה ראשונית לפניי הצעה':
          return 'פולו אפ לפני הצעה'
        case 'מכירה טלפונית':
          return 'מכירה טלפונית'
        case 'שירות לקוחות':
          return 'שירות לקוחות'
        default:
          return type.length > 20 ? type.substring(0, 20) + '...' : type
      }
    })
    
    return { labels: shortLabels, values: types.map(type => summaryData[type].totalCalls) }
  }, [summaryData])
  
  const refreshData = useCallback(() => {
    fetchCallsLogic(() => true);
  }, [fetchCallsLogic])

  // פונקציות לסינון שיחות
  const getFilteredCalls = useCallback(() => {
    switch (currentFilter) {
      case 'successful':
        return calls.filter(call => call.overall_score !== null && call.overall_score >= 8)
      case 'needImprovement':
        return calls.filter(call => call.overall_score !== null && call.overall_score > 0 && call.overall_score < 7)
      default:
        return calls
    }
  }, [calls, currentFilter])

  const handleFilterClick = (filterType: FilterType) => {
    setCurrentFilter(filterType)
  }

  const getFilterTitle = () => {
    switch (currentFilter) {
      case 'successful':
        return 'שיחות מוצלחות (ציון 8+)'
      case 'needImprovement':
        return 'שיחות לשיפור (ציון פחות מ-7)'
      default:
        return 'כל השיחות'
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">טוען את הנתונים...</p>
        </div>
      </div>
    )
  }

  const totalCalls = summaryData['כלל שיחות']?.totalCalls || 0
  const avgScore = summaryData['כלל שיחות']?.avgScore || 0
  const successfulCalls = summaryData['כלל שיחות']?.successfulCalls || 0
  const needImprovementCalls = summaryData['כלל שיחות']?.needImprovementCalls || 0
  const filteredCalls = getFilteredCalls()
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* כותרת עליונה */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">הדשבורד שלי</h1>
              <p className="text-gray-600 mt-1">סקירה כללית של הביצועים שלך</p>
            </div>
            <button 
              onClick={refreshData}
              className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              רענן נתונים
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* כרטיסי סטטיסטיקה */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div 
            onClick={() => handleFilterClick('all')}
            className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all cursor-pointer ${currentFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
              </div>
              <div className="mr-4 flex-1">
                <p className="text-sm font-medium text-gray-600">סה״כ שיחות</p>
                <p className="text-2xl font-bold text-gray-900">{totalCalls}</p>
                <p className="text-xs text-gray-500 mt-1">לחץ לצפייה</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mr-4 flex-1">
                <p className="text-sm font-medium text-gray-600">ציון ממוצע</p>
                <p className="text-2xl font-bold text-gray-900">{avgScore.toFixed(1)}</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => handleFilterClick('successful')}
            className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all cursor-pointer ${currentFilter === 'successful' ? 'ring-2 ring-green-500' : ''}`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="mr-4 flex-1">
                <p className="text-sm font-medium text-gray-600">שיחות מוצלחות</p>
                <p className="text-2xl font-bold text-gray-900">{successfulCalls}</p>
                <p className="text-xs text-gray-500 mt-1">לחץ לצפייה</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => handleFilterClick('needImprovement')}
            className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all cursor-pointer ${currentFilter === 'needImprovement' ? 'ring-2 ring-red-500' : ''}`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                </div>
              </div>
              <div className="mr-4 flex-1">
                <p className="text-sm font-medium text-gray-600">לשיפור</p>
                <p className="text-2xl font-bold text-gray-900">{needImprovementCalls}</p>
                <p className="text-xs text-gray-500 mt-1">לחץ לצפייה</p>
              </div>
            </div>
          </div>
        </div>

        {/* שיחות - מועבר למעלה */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-900">{getFilterTitle()}</h2>
                {currentFilter !== 'all' && (
                  <button
                    onClick={() => setCurrentFilter('all')}
                    className="text-sm text-primary hover:text-primary-dark"
                  >
                    חזור לכל השיחות
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">
                  מציג {filteredCalls.length} מתוך {totalCalls} שיחות
                </span>
                <Link href="/upload" className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  העלה שיחה חדשה
                </Link>
              </div>
            </div>
          </div>
          
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך ושעה</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סוג שיחה</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ציון</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">טונציה</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">דגל אדום</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">משך זמן</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCalls.slice(0, currentFilter === 'all' ? 10 : 20).map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{new Date(call.created_at).toLocaleDateString('he-IL')}</div>
                          <div className="text-gray-500">{new Date(call.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="max-w-xs truncate">{call.call_type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {call.overall_score ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            call.overall_score >= 8 
                              ? 'bg-green-100 text-green-800' 
                              : call.overall_score >= 7
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {call.overall_score.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {call.tone_analysis_report && call.tone_analysis_report.ציון_טונציה ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            call.tone_analysis_report.ציון_טונציה >= 6 
                              ? 'bg-blue-100 text-blue-800' 
                              : call.tone_analysis_report.ציון_טונציה >= 4
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {call.tone_analysis_report.ציון_טונציה}/10 (טווח 3-10)
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {call.red_flag ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            דגל אדום
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            תקין
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        {call.audio_duration_seconds ? `${Math.floor(call.audio_duration_seconds / 60)}:${(Math.floor(call.audio_duration_seconds % 60)).toString().padStart(2, '0')}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Link 
                          href={`/dashboard/calls/${call.id}`} 
                          className="bg-primary hover:bg-primary-dark text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                        >
                          צפה בדוח
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {filteredCalls.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {currentFilter === 'successful' ? 'אין שיחות מוצלחות עדיין' : 
                             currentFilter === 'needImprovement' ? 'אין שיחות לשיפור' : 
                             'אין שיחות עדיין'}
                          </h3>
                          <p className="text-gray-500 mb-4">
                            {currentFilter === 'all' ? 'התחל על ידי העלאת השיחה הראשונה שלך' : 
                             'נסה לחזור לכל השיחות או להעלות שיחות חדשות'}
                          </p>
                          <Link href="/upload" className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                            העלה שיחה חדשה
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {filteredCalls.length > (currentFilter === 'all' ? 10 : 20) && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="text-center">
                <button 
                  onClick={() => setCurrentFilter('all')}
                  className="text-primary hover:text-primary-dark font-medium text-sm"
                >
                  {currentFilter === 'all' ? `צפה בכל השיחות (${calls.length})` : 'צפה בכל השיחות'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* גרפים - מועבר למטה ומוצג תמיד (לא רק כשהסינון הוא 'all') */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">התפלגות שיחות לפי קטגוריה</h2>
              <div className="w-3 h-3 bg-primary rounded-full"></div>
            </div>
            <CallsBarChart data={getChartData()} title="כמות שיחות לפי סוג" height={300} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">מגמת התקדמות</h2>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <ProgressLineChart data={progressData} title="התפתחות הציון לאורך זמן" height={300} />
          </div>
        </div>
      </div>
    </div>
  )
} 